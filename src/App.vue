<script setup lang="ts">
import { computed, reactive, shallowRef } from "vue";

import DirectionalPad from "./DirectionalPad.vue";
import MouseCrosshair from "./MouseCrosshair.vue";
import { generateLEDPattern } from "./generateLEDPattern";

const SERVICE_UUID = "ab7de9be-89fe-49ad-828f-118f09df7fd0";
const INPUT_REPORT_CHARACTERISTIC_UUID = "ab7de9be-89fe-49ad-828f-118f09df7fd2";
const WRITE_COMMAND_CHARACTERISTIC_UUID = "649d4ac9-8eb7-4e6c-af44-1ea54fe5f005";
const POSITION_WRAPAROUND_THRESHOLD = 15000;
const MOUSE_DISPLAY_SCALE = 20;

type ControllerType = "L" | "R";

const controllerPidMap = {
  L: [0x67, 0x20], // little endian
  R: [0x66, 0x20], // little endian
} as const satisfies Record<ControllerType, [number, number]>;
const controllerByteOffsetMap = {
  L: 6,
  R: 4,
} as const satisfies Record<ControllerType, number>;

const createMouseState = () => {
  return {
    rawPosition: {
      x: 0,
      y: 0,
    },
    accumulatedPosition: {
      x: 0,
      y: 0,
    },
  };
};

const mouseState = reactive({
  L: createMouseState(),
  R: createMouseState(),
}) satisfies Record<ControllerType, ReturnType<typeof createMouseState>>;

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

const calculateDeltaWithWraparound = (
  current: number,
  previous: number,
): number => {
  let delta = current - previous;
  if (delta > POSITION_WRAPAROUND_THRESHOLD) {
    delta -= 65536;
  } else if (delta < -POSITION_WRAPAROUND_THRESHOLD) {
    delta += 65536;
  }
  return delta;
};

const processMouseInputReport = (dataView: DataView, type: ControllerType) => {
  const currentRawX = dataView.getUint16(16, true);
  const currentRawY = dataView.getUint16(18, true);

  const deltaX = calculateDeltaWithWraparound(
    currentRawX,
    mouseState[type].rawPosition.x,
  );
  const deltaY = calculateDeltaWithWraparound(
    currentRawY,
    mouseState[type].rawPosition.y,
  );

  mouseState[type].rawPosition.x = currentRawX;
  mouseState[type].rawPosition.y = currentRawY;

  mouseState[type].accumulatedPosition.x += deltaX;
  mouseState[type].accumulatedPosition.y += deltaY;
};

const sleep = (ms: number) => {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
};

const isBluefy = navigator.userAgent.includes("Bluefy");
const ledPatternGenerator = generateLEDPattern();
const connect = async (type: ControllerType) => {
  try {
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
    const characteristicWrite = await service.getCharacteristic(
      WRITE_COMMAND_CHARACTERISTIC_UUID,
    );
    await characteristicWrite.writeValueWithoutResponse(
      new Uint8Array([
        0x09,
        0x91,
        0x01,
        0x07,
        0x00,
        0x08,
        0x00,
        0x00,
        ledPatternGenerator.next().value,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
      ]),
    );
    await sleep(500);
    await characteristicWrite.writeValueWithoutResponse(
      new Uint8Array([
        0x0c, 0x91, 0x01, 0x02, 0x00, 0x04, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00,
      ]),
    );
    await sleep(500);
    await characteristicWrite.writeValueWithoutResponse(
      new Uint8Array([
        0x0c, 0x91, 0x01, 0x04, 0x00, 0x04, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00,
      ]),
    );

    const characteristic = await service.getCharacteristic(
      INPUT_REPORT_CHARACTERISTIC_UUID,
    );
    await characteristic.startNotifications();
    mouseState[type] = createMouseState();
    characteristic.addEventListener(
      "characteristicvaluechanged",
      (event: any) => {
        const dataView = event.target.value as DataView;
        processMouseInputReport(dataView, type);
        pressed[type] = dataView.getUint8(controllerByteOffsetMap[type]);
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
      <a href="https://apps.apple.com/jp/app/bluefy-web-ble-browser/id1492822055"
        >Bluefy</a
      >
      app from the App Store and
      <a :href="openWithBluefyLink">open this page with Bluefy</a>.
    </p>
  </div>

  <div v-else class="app">
    <!-- Joy-Con 2 (L) -->
    <MouseCrosshair
      color="#0ab9e6"
      :x="mouseState.L.accumulatedPosition.x"
      :y="mouseState.L.accumulatedPosition.y"
      :scale="MOUSE_DISPLAY_SCALE"
    />
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
    <MouseCrosshair
      color="#ff3c28"
      :x="mouseState.R.accumulatedPosition.x"
      :y="mouseState.R.accumulatedPosition.y"
      :scale="MOUSE_DISPLAY_SCALE"
    />
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
