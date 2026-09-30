import type { RainlandWeatherPhase, RainlandWeatherState } from "../config/rainlandWeather.ts";
import type { BattleWeatherContext } from "../events/BattleEventData.ts";

/**
 * The sole field-to-battle boundary for weather. A BattleScene receives a value snapshot,
 * never a FieldScene or a mutable weather renderer, so battle restart/return stays safe.
 */
export function createRainlandBattleWeather(state: RainlandWeatherState): BattleWeatherContext {
  return { biome: "rainland-forest", phase: state.phase };
}

export function isRainlandBattleWeather(weather: BattleWeatherContext | undefined): weather is BattleWeatherContext & { readonly phase: RainlandWeatherPhase } {
  return weather?.biome === "rainland-forest";
}
