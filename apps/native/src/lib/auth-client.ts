import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import {
  CAREERIGHT_SCHEME,
  CAREERIGHT_STORAGE_PREFIX,
  getCareerightOrigin,
} from "@/lib/config";

export const authClient = createAuthClient({
  baseURL: getCareerightOrigin(),
  plugins: [
    expoClient({
      scheme: CAREERIGHT_SCHEME,
      storage: SecureStore,
      storagePrefix: CAREERIGHT_STORAGE_PREFIX,
    }),
  ],
});
