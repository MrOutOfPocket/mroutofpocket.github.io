/* AdSense H5 Games Ads bridge for DROPPIN' HEAT (web build only).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * AdMob has no web SDK — it is a mobile-app product. Google's web equivalent
 * for games is H5 Games Ads, driven by the Ad Placement API. This exposes it
 * to GDScript through a tiny window-level shim so the Godot side can call
 * interstitial/rewarded exactly the way it does on mobile.
 *
 * IT IS SAFE TO SHIP BEFORE APPROVAL.
 * H5 Games Ads is a by-application programme. Until the account is approved,
 * adsbygoogle.js either does not load or adBreak() reports no fill — and every
 * path here degrades to "no ad shown", which the game already handles (see
 * AdManager: a missing ad never blocks the player). So this can ship dark and
 * start earning the day approval lands, with no code change.
 *
 * CLIENT ID is filled in from the AdSense account. Empty = the loader is not
 * injected at all, which is the correct behaviour for an unapproved build.
 */
(function () {
  "use strict";

  // Publisher id for H5 Games Ads, e.g. "ca-pub-0000000000000000".
  // Left empty until the AdSense H5 Games Ads application is approved.
  var CLIENT_ID = "";

  var state = {
    ready: false,
    rewardedReady: false,
    // Set by the game before showing a rewarded ad, called on genuine reward.
    onReward: null,
    onRewardedClosed: null,
    onInterstitialClosed: null,
  };

  function log(msg) {
    if (window.console && console.log) console.log("[H5Ads] " + msg);
  }

  // --- loader ---------------------------------------------------------------
  if (CLIENT_ID) {
    var s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
      encodeURIComponent(CLIENT_ID);
    s.setAttribute("data-ad-frequency-hint", "30s");
    s.onload = function () {
      state.ready = true;
      log("Ad Placement API loaded");
    };
    s.onerror = function () {
      log("Ad Placement API failed to load; running ad-free");
    };
    document.head.appendChild(s);

    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adConfig = function (o) {
      window.adsbygoogle.push(o);
    };
    // Rewarded ads must be pre-declared so the API can pre-load them.
    window.adConfig({ preloadAdBreaks: "on" });
  } else {
    log("no client id configured; web build is ad-free");
  }

  // --- the surface GDScript calls ------------------------------------------
  window.DroppinHeatAds = {
    supported: function () {
      return !!CLIENT_ID && state.ready;
    },

    /* Full-screen ad at a natural break. Always calls back, ad or no ad, so
     * the game is never left waiting on a transition that will not come. */
    showInterstitial: function () {
      if (!this.supported()) {
        if (state.onInterstitialClosed) state.onInterstitialClosed();
        return false;
      }
      window.adBreak({
        type: "next",              // between-runs break
        name: "game_over",
        beforeAd: function () {},
        afterAd: function () {
          if (state.onInterstitialClosed) state.onInterstitialClosed();
        },
        adBreakDone: function (info) {
          log("interstitial: " + (info && info.breakStatus));
          if (state.onInterstitialClosed) state.onInterstitialClosed();
        },
      });
      return true;
    },

    /* Opt-in rewarded ad. The reward fires ONLY from beforeReward/adViewed —
     * dismissing early lands in adDismissed and unlocks nothing, matching the
     * mobile behaviour exactly. */
    showRewarded: function () {
      if (!this.supported()) {
        if (state.onRewardedClosed) state.onRewardedClosed();
        return false;
      }
      var earned = false;
      window.adBreak({
        type: "reward",
        name: "bird_unlock",
        beforeReward: function (showAdFn) { showAdFn(); },
        adViewed: function () {
          earned = true;
          if (state.onReward) state.onReward();
        },
        adDismissed: function () { log("rewarded dismissed early"); },
        afterAd: function () {
          if (state.onRewardedClosed) state.onRewardedClosed();
        },
        adBreakDone: function (info) {
          log("rewarded: " + (info && info.breakStatus) + " earned=" + earned);
          if (state.onRewardedClosed) state.onRewardedClosed();
        },
      });
      return true;
    },

    setCallbacks: function (onReward, onRewardedClosed, onInterstitialClosed) {
      state.onReward = onReward;
      state.onRewardedClosed = onRewardedClosed;
      state.onInterstitialClosed = onInterstitialClosed;
    },
  };
})();
