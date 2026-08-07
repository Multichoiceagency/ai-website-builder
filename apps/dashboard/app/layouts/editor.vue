<template>
  <!-- Full-bleed: the editor owns the whole viewport, so the app shell steps
       aside rather than competing with the canvas for space. -->
  <div class="h-screen overflow-hidden bg-sunken">
    <slot />
  </div>
</template>
