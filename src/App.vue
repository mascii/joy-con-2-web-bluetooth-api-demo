<script setup lang="ts">
import { computed, reactive, shallowRef } from "vue";

const SERVICE_UUID = "ab7de9be-89fe-49ad-828f-118f09df7fd0";
const CHARACTERISTIC_UUID = "ab7de9be-89fe-49ad-828f-118f09df7fd2";

type ControllerType = "L" | "R";

const controllerIdMap = {
  L: 0x67,
  R: 0x66,
} as const satisfies Record<ControllerType, number>;
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

const connect = async (type: ControllerType) => {
  try {
    if (!navigator.bluetooth) {
      throw new Error(
        "Web Bluetooth API is not supported in this browser. Please use Google Chrome or Microsoft Edge.",
      );
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: [
        {
          manufacturerData: [
            {
              companyIdentifier: 0x0553, // https://www.bluetooth.com/wp-content/uploads/Files/Specification/Assigned_Numbers.pdf
              dataPrefix: new Uint8Array([
                0x00,
                0x00,
                0x00,
                0x00,
                0x00,
                controllerIdMap[type],
              ]),
              mask: new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0xff]),
            },
          ],
        },
      ],
      optionalServices: [SERVICE_UUID],
    });

    if (!device.gatt) {
      throw new Error("Device does not support GATT");
    }

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
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
</script>

<template>
  <div class="app">
    <!-- Joy-Con 2 (L) -->
    <div class="unit">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <!-- up -->
        <circle cx="100" cy="50" r="20" :class="{ pressed: pressed.L & 2 }" />
        <!-- down -->
        <circle cx="100" cy="150" r="20" :class="{ pressed: pressed.L & 1 }" />
        <!-- left -->
        <circle cx="50" cy="100" r="20" :class="{ pressed: pressed.L & 8 }" />
        <!-- right -->
        <circle cx="150" cy="100" r="20" :class="{ pressed: pressed.L & 4 }" />
      </svg>
      <button type="button" @click="connect('L')">connect L</button>
    </div>

    <!-- Joy-Con 2 (R) -->
    <div class="unit">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <!-- X -->
        <circle cx="100" cy="50" r="20" :class="{ pressed: pressed.R & 2 }" />
        <!-- B -->
        <circle cx="100" cy="150" r="20" :class="{ pressed: pressed.R & 4 }" />
        <!-- Y -->
        <circle cx="50" cy="100" r="20" :class="{ pressed: pressed.R & 1 }" />
        <!-- A -->
        <circle cx="150" cy="100" r="20" :class="{ pressed: pressed.R & 8 }" />
      </svg>
      <button type="button" @click="connect('R')">connect R</button>
    </div>
  </div>

  <div v-if="errorMessage !== null" class="error">
    {{ errorMessage }}
  </div>
</template>

<style scoped>
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
}

.app svg circle {
  fill: #666;
}
.app svg circle.pressed {
  fill: #fff;
}
</style>
