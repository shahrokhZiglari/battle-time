using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace CastleGameFeature;

public partial class CastleGamePage
{
    private enum GameScreen { Menu, Playing, Paused, Settings, Levels, Help, Ended }
    private ElementReference Canvas;
    private IJSObjectReference? Module;
    private DotNetObjectReference<CastleGamePage>? Callback;
    private CastleSnapshot State = new();
    private GameScreen Screen = GameScreen.Menu;
    private GameScreen Back = GameScreen.Menu;
    private bool Ready;
    private bool Disposed;
    private bool HandledResult;
    private string? Error;
    /// <summary>نبردی که فقط متوقف شده و پشتِ منو منتظر است (نه رهاشده)</summary>
    private bool BattleInMenu;
    /// <summary>نامِ همان نبرد، برای نشان دادن در منو</summary>
    private string BattleLabel = "";
    /// <summary>چرخشِ نمایش برای بازی با گوشی (۰ تا ۳، هر واحد ۹۰ درجه)</summary>
    private int Rotation { get; set; }

    /// <summary>کلِ صحنه ۹۰ درجه می‌چرخد؛ اندازه‌ها با ۱۰۰vh/۱۰۰vw جابه‌جا می‌شوند.</summary>
    private string RotationCss => Rotation switch
    {
        1 => "transform: rotate(90deg); transform-origin: center; width: 100vh; height: 100vw; position: absolute; left: 50%; top: 50%; margin: calc(-50vw) 0 0 calc(-50vh);",
        2 => "transform: rotate(180deg); transform-origin: center;",
        3 => "transform: rotate(270deg); transform-origin: center; width: 100vh; height: 100vw; position: absolute; left: 50%; top: 50%; margin: calc(-50vw) 0 0 calc(-50vh);",
        _ => "",
    };

    private Task RotateView()
    {
        Rotation = (Rotation + 1) % 4;
        return Task.CompletedTask;
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender || Disposed) return;
        try
        {
            var path = new Uri(new Uri(Navigation.BaseUri), "قلعه/castle.js").AbsoluteUri;
            Module = await JS.InvokeAsync<IJSObjectReference>("import", path);
            var stored = await Module.InvokeAsync<CastleSettings?>("loadSettings");
            if (Disposed) return;
            GameService.Load(stored);
            Callback = DotNetObjectReference.Create(this);
            State = await Module.InvokeAsync<CastleSnapshot>("initialize", Canvas, Callback, GameService.Settings);
            Ready = true;
        }
        catch (Exception exception) when (exception is JSException or InvalidOperationException)
        {
            Error = exception.Message;
        }
        if (!Disposed) await InvokeAsync(StateHasChanged);
    }

    [JSInvokable]
    public Task OnGameState(CastleSnapshot snapshot) => InvokeAsync(async () =>
    {
        if (Disposed) return;
        State = snapshot;
        if (Screen is GameScreen.Playing or GameScreen.Paused)
        {
            if (snapshot.IsOver)
            {
                Screen = GameScreen.Ended;
                if (!HandledResult)
                {
                    HandledResult = true;
                    if (snapshot.Win == true && !snapshot.IsCustom)
                    {
                        GameService.CompleteLevel(snapshot.LevelIndex);
                        await PersistSettings();
                    }
                }
            }
            else Screen = snapshot.IsPaused ? GameScreen.Paused : GameScreen.Playing;
        }
        StateHasChanged();
    });

    private async Task Command(string action, double value = 0)
    {
        if (Disposed || !Ready || Module is null) return;
        try { State = await Module.InvokeAsync<CastleSnapshot>("command", Canvas, action, value); }
        catch (JSDisconnectedException) { }
    }

    private async Task StartLevel(int index)
    {
        if (index < 0 || index >= GameService.Settings.UnlockedLevel) return;
        HandledResult = false;
        BattleInMenu = false;
        await Command("start", index);
        Screen = GameScreen.Playing;
    }

    private Task Play() => StartLevel(GameService.Settings.UnlockedLevel - 1);
    private Task StartSavedRandomMap() => GenerateRandomMap(GameService.Settings.CustomMap);
    private Task Restart() => State.IsCustom ? GenerateRandomMap(GameService.Settings.CustomMap) : StartLevel(State.LevelIndex);
    private Task Next() => StartLevel(Math.Min(CastleLevelsData.All.Count - 1, State.LevelIndex + 1));
    private Task SetPercent(int percent) => Command("percent", percent);
    private Task Zoom(double delta) => Command("zoom", delta);
    private async Task Pause() { await Command("pause"); Screen = GameScreen.Paused; }
    private async Task Resume() { await Command("resume"); Screen = GameScreen.Playing; }
    /// <summary>
    /// رفتن به منو — بدونِ از دست دادنِ نبرد.
    /// اگر نبردی در جریان باشد فقط متوقف می‌شود و همان بازی سرِ جایش می‌مانَد؛
    /// منو دکمهٔ «بازگشت به بازی» را نشان می‌دهد و نبرد از همان لحظه ادامه می‌یابد.
    /// </summary>
    private async Task Menu()
    {
        if (!State.IsOver && (Screen is GameScreen.Playing or GameScreen.Paused))
        {
            await Command("pause");
            BattleInMenu = true;
            BattleLabel = State.IsCustom
                ? State.LevelName
                : $"مرحلهٔ {State.LevelIndex + 1} · {State.LevelName}";
            Screen = GameScreen.Menu;
            return;
        }
        await Command("demo");
        BattleInMenu = false;
        Screen = GameScreen.Menu;
    }

    /// <summary>ادامهٔ همان نبردی که در منو متوقف شده</summary>
    private async Task ResumeFromMenu()
    {
        if (!BattleInMenu) return;
        await Command("resume");
        BattleInMenu = false;
        Screen = GameScreen.Playing;
    }

    private async Task OpenPanel(GameScreen screen)
    {
        // مقصدِ بازگشت فقط از یک صفحهٔ «غیرِپنل» گرفته می‌شود. اگر کاربر روی
        // «تنظیمات» دوبار بزند (روی گوشی زیاد پیش می‌آید)، بارِ دوم Back را
        // خراب نمی‌کند؛ قبلاً Back = Settings می‌شد و بعد دکمهٔ بازگشت هیچ‌وقت
        // کار نمی‌کرد و کاربر در پنل گیر می‌ماند.
        if (Screen is GameScreen.Menu or GameScreen.Playing or GameScreen.Paused or GameScreen.Ended)
        {
            Back = Screen;
        }
        await Command("pause");
        Screen = screen;
    }

    private Task OpenSettings() => OpenPanel(GameScreen.Settings);
    private Task OpenLevels() => OpenPanel(GameScreen.Levels);
    private Task OpenHelp() => OpenPanel(GameScreen.Help);

    private async Task ClosePanel()
    {
        // هرگز به خودِ یک پنل برنگرد؛ اگر مقصد پنل بود، پیش‌فرضش «بازی» است.
        var target = Back is GameScreen.Settings or GameScreen.Levels or GameScreen.Help
            ? GameScreen.Playing
            : Back;

        Screen = target;

        // برگشتن از پنل یعنی ادامهٔ نبرد: بازی نباید یخ‌زده رها شود.
        if (Screen is GameScreen.Menu or GameScreen.Playing or GameScreen.Paused)
        {
            await Command("resume");
            if (Screen is GameScreen.Paused) Screen = GameScreen.Playing;
        }
    }

    private async Task SaveRules(CastleSettings settings)
    {
        GameService.UpdateRules(settings);
        if (Module is not null)
        {
            await Module.InvokeVoidAsync("applySettings", Canvas, GameService.Settings);
            await PersistSettings();
        }
        await ClosePanel();
    }

    private async Task ApplyImportedRules(CastleSettings settings)
    {
        GameService.UpdateRules(settings);
        await PersistSettings();
    }

    private async Task GenerateRandomMap(RandomMapSettings map)
    {
        var updated = GameService.Settings.Copy();
        updated.CustomMap = map.Copy();
        GameService.UpdateRules(updated);
        await PersistSettings();
        if (Module is not null)
        {
            State = await Module.InvokeAsync<CastleSnapshot>("command", Canvas, "randomMap", GameService.Settings.CustomMap);
            HandledResult = false;
            BattleInMenu = false;
            Screen = GameScreen.Playing;
        }
    }

    private async Task ResetProgress() { GameService.ResetProgress(); await PersistSettings(); }
    private async Task PersistSettings()
    {
        if (Module is not null && !Disposed)
        {
            await Module.InvokeVoidAsync("applySettings", Canvas, GameService.Settings);
            await Module.InvokeVoidAsync("saveSettings", GameService.Settings);
        }
    }

    private void Reload() => Navigation.NavigateTo(Navigation.Uri, forceLoad: true);

    public async ValueTask DisposeAsync()
    {
        Disposed = true;
        if (Module is not null)
        {
            try
            {
                await Module.InvokeVoidAsync("dispose", Canvas);
                await Module.DisposeAsync();
            }
            catch (JSDisconnectedException) { }
            catch (JSException) { }
        }
        Callback?.Dispose();
    }
}