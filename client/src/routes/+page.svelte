<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { LOCK_YEARS } from '$lib/utils/duration';
  import Lock from 'phosphor-svelte/lib/Lock';
  import Copy from 'phosphor-svelte/lib/Copy';
  import Check from 'phosphor-svelte/lib/Check';
  import Spinner from 'phosphor-svelte/lib/Spinner';

  const MAX = 5000;

  let message = $state('');
  let email = $state('');
  let confirming = $state(false);
  let sealing = $state(false);
  let errorMsg = $state('');

  // Success state
  let link = $state('');
  let unlockLabel = $state('');
  let copied = $state(false);

  const emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
  const canSeal = $derived(message.trim().length > 0 && emailValid && !sealing);

  async function seal() {
    if (!canSeal) return;
    sealing = true;
    errorMsg = '';

    try {
      const res = await fetch('/api/lockets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), email: email.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error ?? 'Something went wrong. Please try again.';
        confirming = false;
        return;
      }

      link = `${window.location.origin}/l/${data.token}`;
      unlockLabel = new Date(data.unlockAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      // Clear the plaintext from memory — it's sealed now.
      message = '';
      email = '';
    } catch {
      errorMsg = 'Network error. Please try again.';
      confirming = false;
    } finally {
      sealing = false;
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      /* ignore */
    }
  }
</script>

<div
  class="container mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 p-8"
>
  <span class="flex flex-col items-center gap-2 text-center">
    <h1 class="text-2xl font-extralight md:text-3xl lg:text-4xl">Till Next Election</h1>
    <h6 class="text-muted-foreground text-md font-extralight md:text-lg">
      Write one message. Seal it for {LOCK_YEARS} years.
    </h6>
  </span>

  {#if link}
    <!-- Sealed: show the one link -->
    <div class="flex w-full flex-col items-center gap-6" in:scale={{ start: 0.98, duration: 350 }}>
      <div class="flex flex-col items-center gap-2 text-center">
        <Lock class="size-9" weight="duotone" />
        <h2 class="text-lg font-light md:text-xl">Sealed.</h2>
        <p class="text-muted-foreground max-w-md text-sm font-light">
          Your message is locked until <span class="text-foreground">{unlockLabel}</span>. This is
          the only link to it — save it, and share it with anyone you'd like to open it with you.
          We'll email you a reminder when the time comes.
        </p>
      </div>

      <div class="flex w-full max-w-md items-center gap-2">
        <input
          readonly
          value={link}
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

      <Button href={link} variant="link">Open the locket page →</Button>
    </div>
  {:else}
    <!-- Compose -->
    <div class="flex w-full flex-col gap-3">
      <div class="flex w-full items-center justify-between">
        <label for="message" class="text-sm font-light">Your message</label>
        <span class="text-muted-foreground text-sm font-light">{message.length}/{MAX}</span>
      </div>
      <Textarea
        id="message"
        bind:value={message}
        maxlength={MAX}
        disabled={confirming || sealing}
        placeholder="Dear future me…"
        class="min-h-48 border border-black p-4"
      />

      <label for="email" class="text-sm font-light">Email for your {LOCK_YEARS}-year reminder</label>
      <Input
        id="email"
        type="email"
        bind:value={email}
        disabled={confirming || sealing}
        placeholder="you@example.com"
        class="border border-black"
      />

      {#if errorMsg}
        <p class="text-destructive text-sm font-light" in:fade>{errorMsg}</p>
      {/if}

      {#if !confirming}
        <Button
          size="lg"
          class="mt-2"
          disabled={message.trim().length === 0 || !emailValid}
          onclick={() => (confirming = true)}
        >
          <Lock class="size-5" weight="duotone" /> Seal for {LOCK_YEARS} years
        </Button>
      {:else}
        <div class="border-border bg-card mt-2 flex flex-col gap-3 border p-4" in:fade>
          <p class="text-sm font-light">
            Once sealed, <strong>you won't be able to read or change this message for {LOCK_YEARS}
            years.</strong> You'll get one link and an email reminder. Continue?
          </p>
          <div class="flex gap-2">
            <Button class="flex-1" disabled={!canSeal} onclick={seal}>
              {#if sealing}
                <Spinner class="size-5 animate-spin" weight="duotone" /> Sealing…
              {:else}
                Yes, seal it
              {/if}
            </Button>
            <Button variant="outline" disabled={sealing} onclick={() => (confirming = false)}>
              Go back
            </Button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <footer class="text-muted-foreground fixed bottom-0 z-50 p-1 text-sm font-extralight">
    Inspired by <a class="underline" href="https://sma.robi.work">S.M.A</a> by robi
  </footer>
</div>
