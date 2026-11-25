import type { RelayManagedEndpointRuntimeConfig } from "@t3tools/contracts/relay";
import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";

import { relayRetryAfterMillis } from "./relayResponse.ts";

// Relinking revoked environments is the user's choice; startup takes no action.
export type ManagedTunnelRegistrationResult =
  | { readonly status: "not_linked" | "ready" | "unavailable" | "superseded" | "revoked" }
  | {
      readonly status: "recovery_required";
      readonly config: RelayManagedEndpointRuntimeConfig;
    };

export type ManagedTunnelStartupAction =
  | { readonly action: "none" }
  | { readonly action: "reconcile_link" }
  | {
      readonly action: "request_recovery";
      readonly config: RelayManagedEndpointRuntimeConfig;
    };

export function managedTunnelStartupAction(input: {
  readonly wantsCliLink: boolean;
  readonly registration: ManagedTunnelRegistrationResult;
}): ManagedTunnelStartupAction {
  if (input.registration.status === "recovery_required") {
    return {
      action: "request_recovery",
      config: input.registration.config,
    };
  }
  if (input.wantsCliLink && input.registration.status === "not_linked") {
    return { action: "reconcile_link" };
  }
  return { action: "none" };
}

const MANAGED_TUNNEL_REGISTRATION_RETRY_WINDOW = Duration.minutes(10);

// Back off to minutes and honor Retry-After to avoid adding load to a failing relay.
// Retries must rerun the operation: HttpClient.retryTransient would reuse proofs that
// expire after 60 s or single-use link challenges.
const RELAY_RETRY_MAX_DELAY = Duration.minutes(5);

const relayRetrySchedule = Schedule.exponential("1 second").pipe(
  Schedule.jittered,
  Schedule.modifyDelay(({ duration }) =>
    Effect.succeed(Duration.min(duration, RELAY_RETRY_MAX_DELAY)),
  ),
  Schedule.modifyDelay(({ duration, input }) => {
    const retryAfterMillis = relayRetryAfterMillis(input);
    return Effect.succeed(
      retryAfterMillis === undefined
        ? duration
        : Duration.max(duration, Duration.millis(retryAfterMillis)),
    );
  }),
);

const windowMillis = Duration.toMillis(MANAGED_TUNNEL_REGISTRATION_RETRY_WINDOW);

/**
 * Retries on the relay schedule. The window closes at the first sleep that
 * would end past it: then `onWindowExhausted` runs, and retrying continues
 * only while `whilePastWindow` holds. One schedule covers both sides, so the
 * relay's Retry-After still holds across the handoff.
 */
const retryAcrossWindow = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options: {
    readonly while: (error: E) => boolean;
    readonly whilePastWindow: (error: E) => boolean;
    readonly onWindowExhausted: (error: E) => Effect.Effect<void, never, R>;
  },
) =>
  Effect.suspend(() => {
    let pastWindow = false;
    return effect.pipe(
      Effect.retry({
        while: (error) => (pastWindow ? options.whilePastWindow(error) : options.while(error)),
        schedule: relayRetrySchedule.pipe(
          Schedule.setInputType<E>(),
          Schedule.modifyDelay(({ duration, elapsed, input }) => {
            if (pastWindow || elapsed + Duration.toMillis(duration) < windowMillis) {
              return Effect.succeed(duration);
            }
            pastWindow = true;
            return options.whilePastWindow(input)
              ? options.onWindowExhausted(input).pipe(Effect.as(duration))
              : Effect.fail(input);
          }),
        ),
      }),
    );
  });

export const retryManagedTunnelRegistration = <A, E, R>(
  registration: Effect.Effect<A, E, R>,
  isRetryable: (error: E) => boolean,
  onRetryWindowExhausted?: Effect.Effect<void, never, R>,
) =>
  retryAcrossWindow(registration, {
    while: isRetryable,
    whilePastWindow: onRetryWindowExhausted === undefined ? () => false : isRetryable,
    onWindowExhausted: () => onRetryWindowExhausted ?? Effect.void,
  });
const MANAGED_TUNNEL_RECOVERY_MAX_COOLDOWN = Duration.minutes(30);

const MANAGED_TUNNEL_ORIGIN_CHECK_INTERVAL = Duration.minutes(1);

const urlOrigin = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * Only this server runs the connector, so an ingress naming another origin is a dead
 * registration. Checks every minute and re-registers this origin on a mismatch,
 * doubling the wait (up to 30 minutes) while the relay keeps routing elsewhere.
 */
export const watchManagedTunnelOrigin = Effect.fn("ManagedTunnelOrigin.watch")(function* <
  E,
  R,
>(options: {
  readonly localOrigin: string;
  /** The service URL cloudflared routes the public hostname to, or `null` while unknown. */
  readonly readIngressOrigin: Effect.Effect<string | null>;
  readonly register: Effect.Effect<unknown, E, R>;
}) {
  const localOrigin = urlOrigin(options.localOrigin);
  let wait = MANAGED_TUNNEL_ORIGIN_CHECK_INTERVAL;
  while (true) {
    yield* Effect.sleep(wait);
    const ingress = yield* options.readIngressOrigin;
    // An unreadable ingress says nothing, so it keeps whatever backoff is running.
    if (ingress === null) continue;
    const ingressOrigin = urlOrigin(ingress);
    if (ingressOrigin !== null && ingressOrigin === localOrigin) {
      wait = MANAGED_TUNNEL_ORIGIN_CHECK_INTERVAL;
      continue;
    }
    yield* Effect.logWarning(
      "T3 Connect routes this server's tunnel to another origin; registering this server again",
      { ingressOrigin: ingressOrigin ?? "unparseable", localOrigin },
    );
    yield* options.register.pipe(
      Effect.catchCause((cause) =>
        Cause.hasInterrupts(cause)
          ? Effect.interrupt
          : Effect.logWarning("Failed to register this server's T3 Connect origin again", {
              cause,
            }),
      ),
    );
    wait = Duration.min(Duration.times(wait, 2), MANAGED_TUNNEL_RECOVERY_MAX_COOLDOWN);
  }
});
