export type ChangeStatus =
  | "high"
  | "watch"
  | "normal"
  | "new";

type CurrentMarketData = {
  price: number;
  volume: number | null;
};

type PreviousState = {
  lastSeenPrice: number;
  lastSeenVolume: number | null;
  lastSeenAt: Date;
};

export type ChangeResult = {
  priceChangePercent: number;
  volumeChangePercent: number | null;
  status: ChangeStatus;
  reason: string;
  isFirstSeen: boolean;
};

export function detectChange(
  current: CurrentMarketData,
  previous: PreviousState | null,
  typicalVolume: number | null = null
): ChangeResult {
  /*
   * If the user has never seen this stock before,
   * we don't have a baseline for comparison.
   */
  if (!previous) {
    return {
      priceChangePercent: 0,
      volumeChangePercent: null,
      status: "new",
      reason:
        "Newly added — review this stock and mark as seen to create a baseline.",
      isFirstSeen: true,
    };
  }

  /*
   * Calculate price movement since the user's
   * last seen state.
   */
  const priceChangePercent =
    previous.lastSeenPrice !== 0
      ? ((current.price - previous.lastSeenPrice) /
          previous.lastSeenPrice) *
        100
      : 0;

  /*
   * Calculate volume change relative to the user's
   * previous seen volume.
   *
   * This is useful as a secondary signal.
   */
  let volumeChangePercent: number | null = null;

  if (
    current.volume !== null &&
    previous.lastSeenVolume !== null &&
    previous.lastSeenVolume > 0
  ) {
    volumeChangePercent =
      ((current.volume - previous.lastSeenVolume) /
        previous.lastSeenVolume) *
      100;
  }

  /*
   * Calculate whether today's volume is unusual
   * compared with recent typical volume.
   */
  let unusualVolumePercent: number | null = null;

  if (
    current.volume !== null &&
    typicalVolume !== null &&
    typicalVolume > 0
  ) {
    unusualVolumePercent =
      ((current.volume - typicalVolume) /
        typicalVolume) *
      100;
  }

  const absolutePriceChange =
    Math.abs(priceChangePercent);

  const absoluteVolumeChange =
    volumeChangePercent === null
      ? 0
      : Math.abs(volumeChangePercent);

  const absoluteUnusualVolume =
    unusualVolumePercent === null
      ? 0
      : Math.abs(unusualVolumePercent);

  /*
   * A volume increase of 50% or more compared with
   * recent typical volume is considered unusual.
   *
   * If historical data is not available, we fall back
   * to the user's previous seen volume.
   */
  const hasUnusualVolume =
    unusualVolumePercent !== null
      ? absoluteUnusualVolume >= 50
      : absoluteVolumeChange >= 50;

  /*
   * Determine overall attention level.
   *
   * High:
   * - price movement >= 5%, OR
   * - price movement >= 3% combined with unusual volume
   *
   * Watch:
   * - price movement >= 2%, OR
   * - unusual volume
   */
  let status: ChangeStatus = "normal";

  if (
    absolutePriceChange >= 5 ||
    (absolutePriceChange >= 3 &&
      hasUnusualVolume)
  ) {
    status = "high";
  } else if (
    absolutePriceChange >= 2 ||
    hasUnusualVolume
  ) {
    status = "watch";
  }

  /*
   * Build an explanation that tells the user
   * why the stock was highlighted.
   */
  const reasons: string[] = [];

  if (absolutePriceChange >= 2) {
    reasons.push(
      `Price moved ${
        priceChangePercent >= 0 ? "up" : "down"
      } ${absolutePriceChange.toFixed(2)}%`
    );
  }

  if (
    unusualVolumePercent !== null &&
    absoluteUnusualVolume >= 50
  ) {
    reasons.push(
      `Volume is ${
        unusualVolumePercent >= 0 ? "up" : "down"
      } ${absoluteUnusualVolume.toFixed(0)}% vs recent typical volume`
    );
  } else if (
    unusualVolumePercent === null &&
    absoluteVolumeChange >= 50
  ) {
    reasons.push(
      `Volume changed ${absoluteVolumeChange.toFixed(
        0
      )}% since your last check`
    );
  }

  const reason =
    reasons.length > 0
      ? reasons.join(" and ")
      : "No material change since your last check";

  return {
    priceChangePercent,
    volumeChangePercent,
    status,
    reason,
    isFirstSeen: false,
  };
}