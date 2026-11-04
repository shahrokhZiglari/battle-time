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
        next.CustomMap.MinDistance = Math.Clamp(next.CustomMap.MinDistance, 0, 120);
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