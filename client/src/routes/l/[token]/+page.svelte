<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Button } from '$lib/components/ui/button';
  import { formatRemaining } from '$lib/utils/duration';
  import Lock from 'phosphor-svelte/lib/Lock';
  import LockOpen from 'phosphor-svelte/lib/LockOpen';
  import Copy from 'phosphor-svelte/lib/Copy';
  import Check from 'phosphor-svelte/lib/Check';

  let { data } = $props();

  const dateLabel = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const unlockDateLabel = $derived(dateLabel(data.unlockAt));
  const sealedDateLabel = $derived(dateLabel(data.createdAt));

  let remaining = $state('');
  let copied = $state(false);
  let shareUrl = $state('');
  let interval: ReturnType<typeof setInterval> | undefined;

  onMount(() => {
    shareUrl = window.location.href;
    remaining = formatRemaining(data.unlockAt);
    if (data.locked) {
      interval = setInterval(() => {
        remaining = formatRemaining(data.unlockAt);
        // Reload once the countdown reaches zero so the server can reveal it.
        if (new Date(data.unlockAt).getTime() <= Date.now()) {
          location.reload();
        }
      }, 1000);
    }
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }
</script>

<div
  class="container mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 p-8"
>
  {#if data.locked}
    <div class="flex flex-col items-center gap-3 text-center" in:fade>
      <Lock class="size-10" weight="duotone" />
      <h1 class="text-xl font-extralight md:text-2xl">This locket is sealed</h1>
      <p class="text-muted-foreground max-w-md text-sm font-light">
        Sealed on {sealedDateLabel}. It can be opened on
        <span class="text-foreground">{unlockDateLabel}</span>.
      </p>
    </div>

    <div
      class="border-border bg-card flex w-full flex-col items-center gap-1 border p-8 text-center"
    >
      <span class="text-muted-foreground text-sm font-light tracking-wide uppercase">
        Opens in
      </span>
      <span class="text-lg font-light md:text-xl" aria-live="polite">{remaining}</span>
    </div>

    <div class="flex w-full flex-col items-center gap-2">
      <p class="text-muted-foreground text-sm font-light">
        Keep this link safe — it's the only way back to your locket. You can share it too.
      </p>
      <div class="flex w-full max-w-md items-center gap-2">
        <input
          readonly
          value={shareUrl}
          class="border-input bg-background h-9 w-full truncate border px-3 text-sm font-light"
        />
        <Button variant="outline" onclick={copyLink}>
          {#if copied}
            <Check class="size-4" weight="bold" /> Copied
          {:else}
            <Copy class="size-4" weight="duotone" /> Copy
          {/if}
        </Button>
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center gap-3 text-center" in:fade>
      <LockOpen class="size-10" weight="duotone" />
      <h1 class="text-xl font-extralight md:text-2xl">The locket is open</h1>
      <p class="text-muted-foreground text-sm font-light">
        Sealed on {sealedDateLabel} · unlocked {unlockDateLabel}
      </p>
    </div>

    <div class="border-border bg-card w-full border p-8">
      <p class="text-base leading-relaxed font-light whitespace-pre-wrap">{data.message}</p>
    </div>

    <Button href="/" variant="outline">Seal a new locket</Button>
  {/if}
</div>
