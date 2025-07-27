<script setup lang="ts">
import { computed, reactive, shallowRef } from "vue";

import DirectionalPad from "./DirectionalPad.vue";

const SERVICE_UUID = "ab7de9be-89fe-49ad-828f-118f09df7fd0";
const INPUT_REPORT_CHARACTERISTIC_UUID = "ab7de9be-89fe-49ad-828f-118f09df7fd2";

type ControllerType = "L" | "R";

const controllerPidMap = {
  L: [0x67, 0x20], // little endian
  R: [0x66, 0x20], // little endian
} as const satisfies Record<ControllerType, [number, number]>;
const controllerByteOffsetMap = {
  L: 6,
  R: 4,
} as const satisfies Record<ControllerType, number>;

const pressed = reactive({
  L: 0,
  R: 0,
}) satisfies Record<ControllerType, number>;

const errorRef = shallowRef<unknown>(null);
const errorMessage = computed((): string | null => {
  if (errorRef.value) {
    if (errorRef.value instanceof Error) {
      return errorRef.value.message;
    }
    return "An unknown error occurred";
  }
  return null;
});

const isBluefy = navigator.userAgent.includes("Bluefy");
const connect = async (type: ControllerType) => {
  try {
    if (!navigator.bluetooth) {
      throw new Error(
        "Web Bluetooth API is not supported in this browser. Please use Google Chrome or Microsoft Edge.",
      );
    }

    const device = await navigator.bluetooth
      .requestDevice({
        filters: [
          isBluefy
            ? {
                name: `Joy-Con 2 (${type})`,
              }
            : {
                manufacturerData: [
                  {
                    companyIdentifier: 0x0553, // https://www.bluetooth.com/wp-content/uploads/Files/Specification/Assigned_Numbers.pdf
                    dataPrefix: new Uint8Array([
                      0x00,
                      0x00,
                      0x00,
                      0x00,
                      0x00,
                      ...controllerPidMap[type],
                    ]),
                    mask: new Uint8Array([
                      0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff,
                    ]),
                  },
                ],
              },
        ],
        optionalServices: [SERVICE_UUID],
      })
      .catch((error) => {
        if (isBluefy && error === 2) {
          throw new Error(
            "User cancelled the requestDevice() chooser in Bluefy app.",
          );
        }
        throw error;
      });

    if (!device.gatt) {
      throw new Error("Device does not support GATT");
    }

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(
      INPUT_REPORT_CHARACTERISTIC_UUID,
    );
    await characteristic.startNotifications();
    characteristic.addEventListener(
      "characteristicvaluechanged",
      (event: any) => {
        const value = event.target.value as DataView;
        pressed[type] = value.getUint8(controllerByteOffsetMap[type]);
      },
    );
    errorRef.value = null;
  } catch (error) {
    errorRef.value = error;
    console.error("Error connecting:", error);
  }
};

const showGuideForUnsupportedBrowsers = !navigator.bluetooth;
const openWithBluefyLink = `bluefy://open?url=${encodeURIComponent(location.href)}`;
</script>

<template>
  <div v-if="showGuideForUnsupportedBrowsers" class="guide">
    <p>Web Bluetooth API is not supported in this browser.</p>
    <p>
      If you are using a macOS device, please use Google Chrome or Microsoft
      Edge.
    </p>
    <p>
      If you are using an iOS or iPadOS device, please install the
      <a
        href="https://apps.apple.com/jp/app/bluefy-web-ble-browser/id1492822055"
        >Bluefy</a
      >
      app from the App Store and
      <a :href="openWithBluefyLink">open this page with Bluefy</a>.
    </p>
  </div>

  <div v-else class="app">
    <!-- Joy-Con 2 (L) -->
    <div class="unit">
      <DirectionalPad
        :up="pressed.L & 2"
        :down="pressed.L & 1"
        :left="pressed.L & 8"
        :right="pressed.L & 4"
      />
      <button type="button" @click="connect('L')">Connect L</button>
    </div>

    <!-- Joy-Con 2 (R) -->
    <div class="unit">
      <DirectionalPad
        :up="pressed.R & 2"
        :down="pressed.R & 4"
        :left="pressed.R & 1"
        :right="pressed.R & 8"
      />
      <button type="button" @click="connect('R')">Connect R</button>
    </div>
  </div>

  <div v-if="errorMessage !== null" class="error">
    {{ errorMessage }}
  </div>
</template>

<style scoped>
.guide {
  padding: 0 2rem;
}

.app {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.unit {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.error {
  margin-top: 20px;
  padding: 0 2rem;
  text-align: center;
}
</style>
