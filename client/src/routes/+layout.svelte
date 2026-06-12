<script>
  import '../global.css';
  import { onMount } from 'svelte';

  import SunHorizon from 'phosphor-svelte/lib/SunHorizon';
  import MoonStars from 'phosphor-svelte/lib/MoonStars';
  import { browser } from '$app/environment';

  /** @type {{children?: import('svelte').Snippet}} */
  let { children } = $props();

  let themeDark = $state(false);

  onMount(() => {
    themeDark = document.documentElement.classList.contains('dark');
  });

  function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    if (document.documentElement.classList.contains('dark')) {
      localStorage.theme = 'dark';
      themeDark = true;
    } else {
      localStorage.theme = 'light';
      themeDark = false;
    }
  }
</script>

<div class="relative h-fit min-h-screen">
  {#if browser}
    <div class="absolute right-2 gap-4 p-4 text-sm transition-colors duration-300">
      <button
        type="button"
        class="border-border flex flex-row items-center justify-center gap-2 rounded-xs border px-2 py-1 transition-all"
        onclick={toggleTheme}
      >
        {#if themeDark}
          <SunHorizon size={18} weight="duotone" />
        {:else}
          <MoonStars size={18} weight="duotone" />
        {/if}
        <span class="hidden lg:flex">
          {themeDark ? 'Lights on' : 'Lights off'}
        </span>
      </button>
    </div>
  {/if}
  {@render children?.()}
</div>
