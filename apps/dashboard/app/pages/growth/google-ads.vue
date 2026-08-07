<template>
  <!--
    Google Ads is a `provider` value, not a screen.

    This page and `/growth/meta-ads` differ by one string because every vendor
    shape was mapped into platform types inside the adapter (ADR-0006). The day
    a third network arrives, this file is what it costs.
  -->
  <AdsWorkspace provider="google_ads" />
</template>
