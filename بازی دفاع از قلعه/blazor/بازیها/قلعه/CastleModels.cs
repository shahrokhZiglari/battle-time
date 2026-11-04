namespace CastleGameFeature;

public enum BattleMode { Field = 0, Castle = 1 }

public sealed class RandomMapSettings
{
    public int Players { get; set; } = 3;
    public int Normal { get; set; } = 30;
    public int Fast { get; set; } = 5;
    public int Heavy { get; set; } = 2;
    public int Towers { get; set; } = 3;
    /// <summary>خلیج‌های ساحلی</summary>
    public int Lakes { get; set; } = 2;
    /// <summary>کشتی‌های بادبانی در آب (۰ تا ۱۲)</summary>
    public int Ships { get; set; } = 2;
    /// <summary>قایق‌های پارویی در آب (۰ تا ۱۶)</summary>
    public int Boats { get; set; } = 3;
    public bool LargeMap { get; set; } = true;
    /// <summary>حداقل فاصلهٔ دو قلعهٔ همسایه، به متر</summary>
    public int MinDistance { get; set; } = 30;
    /// <summary>راه‌ها کاملاً رندوم ساخته شوند</summary>
    public bool RandomRoads { get; set; }

    public RandomMapSettings Copy() => new()
    {
        Players = Players, Normal = Normal, Fast = Fast, Heavy = Heavy, Towers = Towers,
        Lakes = Lakes, Ships = Ships, Boats = Boats,
        LargeMap = LargeMap, MinDistance = MinDistance, RandomRoads = RandomRoads
    };
}

public sealed class CastleSettings
{
    public int UnlockedLevel { get; set; } = 1;
    public List<int> CompletedLevels { get; set; } = [];
    public bool SoundEnabled { get; set; } = true;
    public int SpeedMultiplier { get; set; } = 1;
    public BattleMode BattleMode { get; set; } = BattleMode.Field;
    public int MaxTroopsCap { get; set; } = 50;
    public RandomMapSettings CustomMap { get; set; } = new();
    /// <summary>Every castle can reach every other castle.</summary>
    public bool OpenRoads { get; set; } = true;
    /// <summary>حداقل فاصلهٔ دو قلعهٔ همسایه، به متر</summary>
    public int MinCastleDistance { get; set; } = 30;
    /// <summary>Calm nature ambience.</summary>
    public bool AmbientSound { get; set; } = true;
    /// <summary>Marching sound while troops travel.</summary>
    public bool MarchSound { get; set; } = true;
    /// <summary>قدرت و سرعتِ هر نوع سرباز</summary>
    public UnitTuningSettings TroopTuning { get; set; } = new();
    /// <summary>سرعتِ چرخشِ نورهای دور برج (۰ تا ۳)</summary>
    public double HaloSpin { get; set; } = 1.35;
    /// <summary>شفافیتِ نقطه‌چینِ مسیر حمله (۰ تا ۱)</summary>
    public double AttackDash { get; set; } = 1;
    /// <summary>بلندیِ تک‌تکِ صداها و افکت‌ها (۰ تا ۱) — هر کلید یک اسلایدر در تنظیمات</summary>
    public Dictionary<string, double> Volumes { get; set; } = DefaultVolumes();

    /// <summary>کلیدهای صدا با مقدارِ کامل — هم‌ارز SFX_KEYS در موتور جاوااسکریپت</summary>
    public static Dictionary<string, double> DefaultVolumes() => new(StringComparer.Ordinal)
    {
        ["ambient"] = 1, ["march"] = 1, ["capture"] = 1,
        ["select"] = 1, ["deselect"] = 1, ["send"] = 1, ["lose"] = 1, ["repel"] = 1, ["upgrade"] = 1,
        ["shot"] = 1, ["clash"] = 1, ["win"] = 1, ["defeat"] = 1, ["start"] = 1, ["hover"] = 1,
    };

    /// <summary>بلندیِ یک صدا (کلیدِ ناشناس = ۱۰۰٪)</summary>
    public double VolumeOf(string key) =>
        Volumes is not null && Volumes.TryGetValue(key, out var v) ? Math.Clamp(v, 0, 1) : 1;

    public void SetVolume(string key, double value)
    {
        Volumes ??= DefaultVolumes();
        Volumes[key] = Math.Clamp(value, 0, 1);
    }

    public CastleSettings Copy() => new()
    {
        UnlockedLevel = UnlockedLevel,
        CompletedLevels = [.. CompletedLevels ?? []],
        SoundEnabled = SoundEnabled,
        SpeedMultiplier = SpeedMultiplier,
        BattleMode = BattleMode,
        MaxTroopsCap = MaxTroopsCap,
        CustomMap = (CustomMap ?? new RandomMapSettings()).Copy(),
        OpenRoads = OpenRoads,
        MinCastleDistance = MinCastleDistance,
        AmbientSound = AmbientSound,
        MarchSound = MarchSound,
        TroopTuning = (TroopTuning ?? new UnitTuningSettings()).Copy(),
        HaloSpin = HaloSpin,
        AttackDash = AttackDash,
        Volumes = Volumes is null ? DefaultVolumes() : new Dictionary<string, double>(Volumes, StringComparer.Ordinal)
    };
}

/// <summary>تنظیمِ قدرت و سرعتِ هر نوع سرباز (هم‌ارز unitTuning در موتور جاوااسکریپت).</summary>
public sealed class UnitTuningSettings
{
    public double NormalPower { get; set; } = 1;
    public double NormalSpeed { get; set; } = 1;
    public double FastPower { get; set; } = 1;
    public double FastSpeed { get; set; } = 1.5;
    public double HeavyPower { get; set; } = 2;
    public double HeavySpeed { get; set; } = 0.67;

    public UnitTuningSettings Copy() => new()
    {
        NormalPower = NormalPower, NormalSpeed = NormalSpeed,
        FastPower = FastPower, FastSpeed = FastSpeed,
        HeavyPower = HeavyPower, HeavySpeed = HeavySpeed
    };
}

public sealed class CastleSnapshot
{
    public int LevelIndex { get; set; }
    public string LevelName { get; set; } = "";
    public bool IsCustom { get; set; }
    public bool LargeMap { get; set; }
    public double Zoom { get; set; } = 1;
    public List<CastleFactionSnapshot> Factions { get; set; } = [];
    public int PlayerTroops { get; set; }
    public int EnemyTroops { get; set; }
    public double PlayerPower { get; set; }
    public double EnemyPower { get; set; }
    public int PlayerCastles { get; set; }
    public int EnemyCastles { get; set; }
    /// <summary>Castles the player has selected.</summary>
    public int SelectedCount { get; set; }
    /// <summary>Troops ready to dispatch from the selected castles.</summary>
    public int SelectedTroops { get; set; }
    public int ReadyTroops { get; set; }
    public double ReadyPower { get; set; }
    public int Percent { get; set; } = 50;
    public double TimeSeconds { get; set; }
    public bool IsPaused { get; set; }
    public bool IsOver { get; set; }
    public bool? Win { get; set; }
    public string Message { get; set; } = "";
}

public sealed class CastleFactionSnapshot
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Troops { get; set; }
    public double Power { get; set; }
    public int Castles { get; set; }
    public string Color { get; set; } = "#cfd8dc";
}

public sealed record CastleLevelInfo(int Index, string Name, string Hint);