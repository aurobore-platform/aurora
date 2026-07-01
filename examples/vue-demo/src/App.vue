<script setup lang="ts">
import { onMounted, ref } from "vue";
import { isAuroboreError } from "@aurobore/core";
import { useLifecycle } from "@aurobore/vue";
import { Echo } from "@aurobore/echo";
import { Device } from "@aurobore/device";

const status = ref("Loading…");
const { event: lifecycleEvent } = useLifecycle();

onMounted(async () => {
  try {
    const ping = await Echo.ping({});
    const info = await Device.getInfo({});
    status.value = `Echo pong=${ping.pong}, device=${info.model}`;
    document.dispatchEvent(new CustomEvent("aurobore:ready"));
  } catch (err) {
    status.value = isAuroboreError(err) ? `${err.code}: ${err.message}` : String(err);
  }
});

async function onPing() {
  try {
    const result = await Echo.ping({});
    status.value = `ping → pong=${result.pong}, ts=${result.ts}`;
  } catch (err) {
    status.value = String(err);
  }
}

async function onEcho() {
  try {
    const result = await Echo.echo({ hello: "Aurobore" });
    status.value = `echo → ${JSON.stringify(result)}`;
  } catch (err) {
    status.value = String(err);
  }
}
</script>

<template>
  <main>
    <h1>Vue Demo</h1>
    <p id="status">{{ status }}</p>
    <div class="actions">
      <button type="button" @click="onPing">Echo ping</button>
      <button type="button" @click="onEcho">Echo echo</button>
    </div>
    <p class="muted">Lifecycle: {{ lifecycleEvent ?? "—" }}</p>
  </main>
</template>

<style scoped>
main {
  max-width: 40rem;
  padding: 1rem;
  font-family: system-ui, sans-serif;
  background: #1a1a2e;
  color: #eee;
  min-height: 100vh;
  box-sizing: border-box;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #4a9eff;
  color: #fff;
  cursor: pointer;
}

button:active {
  opacity: 0.85;
}

.muted {
  color: #aaa;
  font-size: 0.9rem;
}
</style>
