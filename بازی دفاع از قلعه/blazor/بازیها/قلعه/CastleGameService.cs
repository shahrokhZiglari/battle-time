namespace CastleGameFeature;

// Scoped to the user's Blazor circuit, never shared between players.
public sealed class CastleGameService
{
    public CastleSettings Settings { get; private set; } = new();

    public void Load(CastleSettings? settings)
    {
        var next = settings?.Copy() ?? new CastleSettings();
        next.UnlockedLevel = Math.Clamp(next.UnlockedLevel, 1, 30);
        next.CompletedLevels = next.CompletedLevels.Where(i => i is >= 0 and < 30).Distinct().ToList();
        next.SpeedMultiplier = Math.Clamp(next.SpeedMultiplier, 1, 3);
        next.MaxTroopsCap = Math.Clamp(next.MaxTroopsCap, 1, 1000);
        next.MinCastleDistance = Math.Clamp(next.MinCastleDistance, 0, 120);
        next.CustomMap ??= new RandomMapSettings();
        next.CustomMap.Players = Math.Clamp(next.CustomMap.Players, 2, 4);
        next.CustomMap.Normal = Math.Clamp(next.CustomMap.Normal, 0, 50);
        next.CustomMap.Fast = Math.Clamp(next.CustomMap.Fast, 0, 50);
        next.CustomMap.Heavy = Math.Clamp(next.CustomMap.Heavy, 0, 50);
        next.CustomMap.Towers = Math.Clamp(next.CustomMap.Towers, 0, 50);
        next.CustomMap.Lakes = Math.Clamp(next.CustomMap.Lakes, 0, 16);
        next.CustomMap.Ships = Math.Clamp(next.CustomMap.Ships, 0, 12);
        next.CustomMap.Boats = Math.Clamp(next.CustomMap.Boats, 0, 16);
        next.CustomMap.MinDistance = Math.Clamp(next.CustomMap.MinDistance, 0, 120);
        next.HaloSpin = Math.Clamp(next.HaloSpin, 0, 3);
        next.AttackDash = Math.Clamp(next.AttackDash, 0, 1);
        next.TroopTuning ??= new UnitTuningSettings();
        next.TroopTuning.NormalPower = Math.Clamp(next.TroopTuning.NormalPower, 0.5, 4);
        next.TroopTuning.NormalSpeed = Math.Clamp(next.TroopTuning.NormalSpeed, 0.4, 2.5);
        next.TroopTuning.FastPower = Math.Clamp(next.TroopTuning.FastPower, 0.5, 4);
        next.TroopTuning.FastSpeed = Math.Clamp(next.TroopTuning.FastSpeed, 0.4, 2.5);
        next.TroopTuning.HeavyPower = Math.Clamp(next.TroopTuning.HeavyPower, 0.5, 4);
        next.TroopTuning.HeavySpeed = Math.Clamp(next.TroopTuning.HeavySpeed, 0.4, 2.5);
        if (!Enum.IsDefined(next.BattleMode)) next.BattleMode = BattleMode.Field;
        Settings = next;
    }

    public void UpdateRules(CastleSettings rules)
    {
        var next = rules.Copy();
        next.CompletedLevels = [.. Settings.CompletedLevels];
        next.UnlockedLevel = Settings.UnlockedLevel;
        Load(next);
    }

    public void CompleteLevel(int index)
    {
        if (index is < 0 or >= 30) return;
        if (!Settings.CompletedLevels.Contains(index)) Settings.CompletedLevels.Add(index);
        Settings.UnlockedLevel = Math.Max(Settings.UnlockedLevel, Math.Min(30, index + 2));
    }

    public void ResetProgress()
    {
        Settings.CompletedLevels.Clear();
        Settings.UnlockedLevel = 1;
    }
}