using System.Text.Json;
using System.Text.Json.Serialization;

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

/// <summary>
/// خروجی و ورودیِ مشترکِ تنظیمات بین نسخهٔ وب، فایل آفلاین و Blazor Server.
/// ساختارِ خروجی دقیقاً با exportSettingsJson در save.ts یکسان است و هنگامِ
/// وارد کردن، هم قالبِ مشترک و هم قالب‌های خامِ وب و Blazor پذیرفته می‌شوند.
/// </summary>
public static class CastleSettingsTransfer
{
    public const string FormatName = "battle-time-settings";
    public const int FormatVersion = 1;
    public const string FileName = "battle-time-settings.json";

    private static readonly string[] KnownVolumeKeys =
    [
        "ambient", "march", "capture",
        "select", "deselect", "send", "lose", "repel", "upgrade",
        "shot", "clash", "win", "defeat", "start", "hover",
    ];

    private static readonly JsonSerializerOptions WriteOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private sealed record PortableUnitDto(double Power, double Speed);
    private sealed record PortableUnitsDto(PortableUnitDto Normal, PortableUnitDto Fast, PortableUnitDto Heavy);
    private sealed record PortableSoundDto(bool Enabled, bool Ambient, bool March, Dictionary<string, double> Volumes);
    private sealed record PortableGameplayDto(int Speed, string BattleMode, int MaxTroops, bool OpenRoads, int MinCastleDistance);
    private sealed record PortableVisualsDto(double HaloSpin, double AttackDash);
    private sealed record PortableMapDto(
        int Players, int Normal, int Fast, int Heavy, int Towers,
        int Lakes, int Ships, int Boats, bool LargeMap, int MinDistance, bool RandomRoads);
    private sealed record PortableDocumentDto(
        [property: JsonPropertyName("format")] string Format,
        [property: JsonPropertyName("version")] int Version,
        PortableSoundDto Sound,
        PortableGameplayDto Gameplay,
        PortableUnitsDto Units,
        PortableVisualsDto Visuals,
        PortableMapDto RandomMap);

    private static double Round2(double value, double min, double max)
        => Math.Clamp(Math.Round(value * 100) / 100, min, max);

    public static string Export(CastleSettings? settings)
    {
        var s = (settings ?? new CastleSettings()).Copy();
        var t = s.TroopTuning ?? new UnitTuningSettings();
        var m = s.CustomMap ?? new RandomMapSettings();
        var volumes = new Dictionary<string, double>(StringComparer.Ordinal);
        foreach (var key in KnownVolumeKeys)
        {
            volumes[key] = Round2(s.VolumeOf(key), 0, 1);
        }

        var speed = s.SpeedMultiplier is 2 or 3 ? s.SpeedMultiplier : 1;
        var doc = new PortableDocumentDto(
            FormatName,
            FormatVersion,
            new PortableSoundDto(s.SoundEnabled, s.AmbientSound, s.MarchSound, volumes),
            new PortableGameplayDto(
                speed,
                s.BattleMode == BattleMode.Castle ? "castle" : "field",
                Math.Clamp(s.MaxTroopsCap, 1, 1000),
                s.OpenRoads,
                Math.Clamp(s.MinCastleDistance, 0, 120)),
            new PortableUnitsDto(
                new PortableUnitDto(Round2(t.NormalPower, 0.5, 4), Round2(t.NormalSpeed, 0.4, 2.5)),
                new PortableUnitDto(Round2(t.FastPower, 0.5, 4), Round2(t.FastSpeed, 0.4, 2.5)),
                new PortableUnitDto(Round2(t.HeavyPower, 0.5, 4), Round2(t.HeavySpeed, 0.4, 2.5))),
            new PortableVisualsDto(Round2(s.HaloSpin, 0, 3), Round2(s.AttackDash, 0, 1)),
            new PortableMapDto(
                Math.Clamp(m.Players, 2, 4),
                Math.Clamp(m.Normal, 0, 50),
                Math.Clamp(m.Fast, 0, 50),
                Math.Clamp(m.Heavy, 0, 50),
                Math.Clamp(m.Towers, 0, 50),
                Math.Clamp(m.Lakes, 0, 16),
                Math.Clamp(m.Ships, 0, 12),
                Math.Clamp(m.Boats, 0, 16),
                m.LargeMap,
                Math.Clamp(m.MinDistance, 0, 120),
                m.RandomRoads));

        return JsonSerializer.Serialize(doc, WriteOptions);
    }

    public static bool TryImport(string? text, CastleSettings? current, out CastleSettings result, out string? error)
    {
        result = (current ?? new CastleSettings()).Copy();
        error = null;

        var cleaned = (text ?? string.Empty).TrimStart('\uFEFF').Trim();
        if (cleaned.Length == 0)
        {
            error = "کادر خالی است؛ کد JSON تنظیمات را وارد یا فایل را انتخاب کنید.";
            return false;
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(cleaned);
        }
        catch (JsonException)
        {
            error = "کد واردشده JSON معتبر نیست؛ مطمئن شوید متن کامل کپی شده باشد.";
            return false;
        }

        using (doc)
        {
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                error = "ساختار تنظیمات نامعتبر است؛ یک شیء JSON انتظار می‌رفت.";
                return false;
            }

            var draft = result.Copy();
            draft.CustomMap ??= new RandomMapSettings();
            draft.TroopTuning ??= new UnitTuningSettings();
            draft.Volumes ??= CastleSettings.DefaultVolumes();

            var hasSoundObj = TryGetObject(root, out var soundObj, "sound", "Sound");
            var hasGameObj = TryGetObject(root, out var gameObj, "gameplay", "Gameplay");
            var hasUnitsObj = TryGetObject(root, out var unitsObj, "units", "Units", "unitTuning", "UnitTuning", "troopTuning", "TroopTuning");
            var hasVisObj = TryGetObject(root, out var visObj, "visuals", "Visuals");
            var hasMapObj = TryGetObject(root, out var nestedMapObj, "randomMap", "RandomMap", "customMap", "CustomMap");

            var recognized = 0;

            // ۱) صدا و بلندی‌ها
            if (TryPickBool(hasSoundObj, soundObj, ["enabled", "Enabled"], root, ["snd", "soundEnabled", "SoundEnabled"], out var snd))
            {
                draft.SoundEnabled = snd;
                recognized++;
            }
            if (TryPickBool(hasSoundObj, soundObj, ["ambient", "Ambient"], root, ["ambientSound", "AmbientSound"], out var amb))
            {
                draft.AmbientSound = amb;
                recognized++;
            }
            if (TryPickBool(hasSoundObj, soundObj, ["march", "March"], root, ["marchSound", "MarchSound"], out var march))
            {
                draft.MarchSound = march;
                recognized++;
            }
            if (TryPickObject(hasSoundObj, soundObj, ["volumes", "Volumes"], root, ["volumes", "Volumes"], out var volsEl))
            {
                foreach (var key in KnownVolumeKeys)
                {
                    if (volsEl.TryGetProperty(key, out var vEl) && TryReadNumber(vEl, out var vol))
                    {
                        draft.SetVolume(key, Round2(vol, 0, 1));
                        recognized++;
                    }
                }
            }

            // ۲) قوانینِ بازی
            if (TryPickNumber(hasGameObj, gameObj, ["speed", "Speed"], root, ["speed", "speedMultiplier", "SpeedMultiplier"], out var spd))
            {
                var speedInt = (int)Math.Floor(spd);
                draft.SpeedMultiplier = speedInt is 2 or 3 ? speedInt : 1;
                recognized++;
            }
            if (TryPickProp(hasGameObj, gameObj, ["battleMode", "BattleMode"], root, ["battleMode", "BattleMode"], out var bmEl))
            {
                if (TryParseBattleMode(bmEl, out var bm))
                {
                    draft.BattleMode = bm;
                    recognized++;
                }
            }
            if (TryPickNumber(hasGameObj, gameObj, ["maxTroops", "MaxTroops", "maxTroopsCap", "MaxTroopsCap"], root, ["maxTroops", "maxTroopsCap", "MaxTroopsCap"], out var cap))
            {
                var capInt = (int)Math.Floor(cap);
                draft.MaxTroopsCap = capInt is >= 1 and <= 1000 ? capInt : 50;
                recognized++;
            }
            if (TryPickBool(hasGameObj, gameObj, ["openRoads", "OpenRoads"], root, ["openRoads", "OpenRoads"], out var openR))
            {
                draft.OpenRoads = openR;
                recognized++;
            }
            if (TryPickNumber(hasGameObj, gameObj, ["minCastleDistance", "MinCastleDistance"], root, ["minCastleDistance", "MinCastleDistance"], out var dist))
            {
                draft.MinCastleDistance = Math.Clamp((int)Math.Floor(dist), 0, 120);
                recognized++;
            }

            // ۳) قدرت و سرعتِ سربازها
            if (hasUnitsObj)
            {
                recognized += ApplyUnitStat(unitsObj, "normal", "Normal", v => draft.TroopTuning.NormalPower = Round2(v, 0.5, 4), v => draft.TroopTuning.NormalSpeed = Round2(v, 0.4, 2.5));
                recognized += ApplyUnitStat(unitsObj, "fast", "Fast", v => draft.TroopTuning.FastPower = Round2(v, 0.5, 4), v => draft.TroopTuning.FastSpeed = Round2(v, 0.4, 2.5));
                recognized += ApplyUnitStat(unitsObj, "heavy", "Heavy", v => draft.TroopTuning.HeavyPower = Round2(v, 0.5, 4), v => draft.TroopTuning.HeavySpeed = Round2(v, 0.4, 2.5));
            }

            // ۴) نمایش
            if (TryPickNumber(hasVisObj, visObj, ["haloSpin", "HaloSpin"], root, ["haloSpin", "HaloSpin"], out var halo))
            {
                draft.HaloSpin = Round2(halo, 0, 3);
                recognized++;
            }
            if (TryPickNumber(hasVisObj, visObj, ["attackDash", "AttackDash"], root, ["attackDash", "AttackDash"], out var dash))
            {
                draft.AttackDash = Round2(dash, 0, 1);
                recognized++;
            }

            // ۵) نقشهٔ رندوم
            var mapSrc = hasMapObj ? nestedMapObj : root;
            var touchedMap = false;
            if (TryGetNumber(mapSrc, out var players, "players", "Players")) { draft.CustomMap.Players = Math.Clamp((int)Math.Floor(players), 2, 4); recognized++; touchedMap = true; }
            if (TryGetNumber(mapSrc, out var normal, "normal", "Normal")) { draft.CustomMap.Normal = Math.Clamp((int)Math.Floor(normal), 0, 50); recognized++; touchedMap = true; }
            if (TryGetNumber(mapSrc, out var fast, "fast", "Fast")) { draft.CustomMap.Fast = Math.Clamp((int)Math.Floor(fast), 0, 50); recognized++; touchedMap = true; }
            if (TryGetNumber(mapSrc, out var heavy, "heavy", "Heavy")) { draft.CustomMap.Heavy = Math.Clamp((int)Math.Floor(heavy), 0, 50); recognized++; touchedMap = true; }
            if (TryGetNumber(mapSrc, out var towers, "towers", "Towers")) { draft.CustomMap.Towers = Math.Clamp((int)Math.Floor(towers), 0, 50); recognized++; touchedMap = true; }
            if (TryGetNumber(mapSrc, out var lakes, "lakes", "Lakes")) { draft.CustomMap.Lakes = Math.Clamp((int)Math.Floor(lakes), 0, 16); recognized++; touchedMap = true; }
            if (TryGetNumber(mapSrc, out var ships, "ships", "Ships")) { draft.CustomMap.Ships = Math.Clamp((int)Math.Floor(ships), 0, 12); recognized++; touchedMap = true; }
            if (TryGetNumber(mapSrc, out var boats, "boats", "Boats")) { draft.CustomMap.Boats = Math.Clamp((int)Math.Floor(boats), 0, 16); recognized++; touchedMap = true; }
            if (TryGetNumber(mapSrc, out var minDist, "minDistance", "MinDistance")) { draft.CustomMap.MinDistance = Math.Clamp((int)Math.Floor(minDist), 0, 120); recognized++; touchedMap = true; }
            if (TryGetBool(mapSrc, out var largeMap, "largeMap", "LargeMap")) { draft.CustomMap.LargeMap = largeMap; recognized++; touchedMap = true; }
            if (TryGetBool(mapSrc, out var randRoads, "randomRoads", "RandomRoads")) { draft.CustomMap.RandomRoads = randRoads; recognized++; touchedMap = true; }

            if (recognized == 0)
            {
                error = "هیچ تنظیم شناخته‌شده‌ای در این کد یا فایل پیدا نشد.";
                return false;
            }

            if (touchedMap)
            {
                var castles = draft.CustomMap.Normal + draft.CustomMap.Fast + draft.CustomMap.Heavy;
                var total = castles + draft.CustomMap.Towers;
                if (castles < draft.CustomMap.Players)
                {
                    error = "برای هر بازیکن دست‌کم یک قلعه لازم است؛ برج پایگاه شروع نیست.";
                    return false;
                }
                if (total > 50)
                {
                    error = "نقشه برای حفظ فاصلهٔ قلعه‌ها حداکثر ۵۰ ساختمان می‌تواند داشته باشد.";
                    return false;
                }
            }

            // پیشرفتِ مراحلِ بازیکن حفظ می‌شود
            draft.UnlockedLevel = result.UnlockedLevel;
            draft.CompletedLevels = [.. result.CompletedLevels];
            result = draft;
            return true;
        }
    }

    private static int ApplyUnitStat(JsonElement unitsObj, string camel, string pascal, Action<double> setPower, Action<double> setSpeed)
    {
        var count = 0;
        var hasSub = TryGetObject(unitsObj, out var sub, camel, pascal);
        if (TryPickNumber(hasSub, sub, ["power", "Power"], unitsObj, [camel + "Power", pascal + "Power"], out var p))
        {
            setPower(p);
            count++;
        }
        if (TryPickNumber(hasSub, sub, ["speed", "Speed"], unitsObj, [camel + "Speed", pascal + "Speed"], out var s))
        {
            setSpeed(s);
            count++;
        }
        return count;
    }

    private static bool TryPickProp(bool hasNested, JsonElement nested, string[] nestedNames, JsonElement root, string[] rootNames, out JsonElement value)
        => hasNested ? TryGetProp(nested, out value, nestedNames) : TryGetProp(root, out value, rootNames);

    private static bool TryPickObject(bool hasNested, JsonElement nested, string[] nestedNames, JsonElement root, string[] rootNames, out JsonElement value)
        => hasNested ? TryGetObject(nested, out value, nestedNames) : TryGetObject(root, out value, rootNames);

    private static bool TryPickBool(bool hasNested, JsonElement nested, string[] nestedNames, JsonElement root, string[] rootNames, out bool value)
        => hasNested ? TryGetBool(nested, out value, nestedNames) : TryGetBool(root, out value, rootNames);

    private static bool TryPickNumber(bool hasNested, JsonElement nested, string[] nestedNames, JsonElement root, string[] rootNames, out double value)
        => hasNested ? TryGetNumber(nested, out value, nestedNames) : TryGetNumber(root, out value, rootNames);

    private static bool TryParseBattleMode(JsonElement el, out BattleMode mode)
    {
        mode = BattleMode.Field;
        if (el.ValueKind == JsonValueKind.String)
        {
            var str = el.GetString();
            if (string.Equals(str, "field", StringComparison.OrdinalIgnoreCase)) { mode = BattleMode.Field; return true; }
            if (string.Equals(str, "castle", StringComparison.OrdinalIgnoreCase)) { mode = BattleMode.Castle; return true; }
        }
        else if (TryReadNumber(el, out var n))
        {
            if ((int)n == 0) { mode = BattleMode.Field; return true; }
            if ((int)n == 1) { mode = BattleMode.Castle; return true; }
        }
        return false;
    }

    private static bool TryGetProp(JsonElement obj, out JsonElement value, params string[] names)
    {
        value = default;
        if (obj.ValueKind != JsonValueKind.Object) return false;
        foreach (var name in names)
        {
            if (obj.TryGetProperty(name, out var candidate) && candidate.ValueKind is not (JsonValueKind.Null or JsonValueKind.Undefined))
            {
                value = candidate;
                return true;
            }
        }
        return false;
    }

    private static bool TryGetObject(JsonElement obj, out JsonElement value, params string[] names)
    {
        if (TryGetProp(obj, out var candidate, names) && candidate.ValueKind == JsonValueKind.Object)
        {
            value = candidate;
            return true;
        }
        value = default;
        return false;
    }

    private static bool TryGetBool(JsonElement obj, out bool value, params string[] names)
    {
        value = false;
        if (!TryGetProp(obj, out var candidate, names)) return false;
        if (candidate.ValueKind == JsonValueKind.True) { value = true; return true; }
        if (candidate.ValueKind == JsonValueKind.False) { value = false; return true; }
        return false;
    }

    private static bool TryGetNumber(JsonElement obj, out double value, params string[] names)
    {
        value = 0;
        return TryGetProp(obj, out var candidate, names) && TryReadNumber(candidate, out value);
    }

    private static bool TryReadNumber(JsonElement el, out double value)
    {
        value = 0;
        return el.ValueKind == JsonValueKind.Number && el.TryGetDouble(out value) && double.IsFinite(value);
    }
}