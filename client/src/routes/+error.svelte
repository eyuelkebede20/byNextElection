<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '$lib/components/ui/button';
</script>

<div class="container mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
  <h1 class="text-2xl font-extralight">{page.status}</h1>
  <p class="text-muted-foreground font-light">{page.error?.message ?? 'Something went wrong.'}</p>
  <Button href="/" variant="outline">Back to start</Button>
</div>
