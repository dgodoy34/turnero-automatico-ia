"use client";

import { useEffect, useState } from "react";

export function useRestaurant() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // 🔥 MODO LOCAL / DASHBOARD
        setRestaurantId("f9661b52-312d-46f6-9615-89aecfbb8a09");
      } catch (e) {
        console.error("Error loading restaurant");
      }
    }

    load();
  }, []);

  return restaurantId;
}