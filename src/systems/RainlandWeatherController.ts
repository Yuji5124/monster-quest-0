import { advanceRainlandWeather, createDefaultRainlandWeatherState } from "../config/rainlandWeather.ts";
import type { RainlandWeatherState } from "../config/rainlandWeather.ts";
import { createRainlandBattleWeather } from "./BattleWeatherBridge.ts";
import { GameStateRepository } from "./GameStateRepository.ts";
import type { BattleWeatherContext } from "../events/BattleEventData.ts";

/**
 * Saved state and progression rules for No.05. Phaser renderers remain disposable views of
 * this controller's state; they do not decide which weather is active.
 */
export class RainlandWeatherController {
  private readonly gameState: GameStateRepository;
  private state: RainlandWeatherState;
  private lastSavedDistance: number;

  constructor(gameState: GameStateRepository) {
    this.gameState = gameState;
    this.state = gameState.getRainlandForestWeather() ?? createDefaultRainlandWeatherState();
    this.lastSavedDistance = this.state.phaseDistance;
  }

  get current(): RainlandWeatherState {
    return this.state;
  }

  /** Advances only from actual exploration movement, never from idle time or battle time. */
  advanceExploration(distance: number): RainlandWeatherState {
    const next = advanceRainlandWeather(this.state, distance);
    // Persist at phase boundaries and periodically while walking. This avoids a localStorage write
    // every frame while allowing a manual record/reload to resume near the same weather beat.
    if (next.phase !== this.state.phase || next.phaseDistance - this.lastSavedDistance >= 120) {
      this.gameState.saveRainlandForestWeather(next);
      this.lastSavedDistance = next.phaseDistance;
    }
    this.state = next;
    return next;
  }

  /** Captures the active weather at battle entry; the battle has no hidden dependency on the field Scene. */
  toBattleWeather(): BattleWeatherContext {
    return createRainlandBattleWeather(this.state);
  }
}
