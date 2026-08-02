import { describe, expect, it } from "vitest";
import { validateProviderSites } from "./contract";

const valid = {
  external_id: " station-1 ",
  name: " Central Garage ",
  address: "Main Street 1",
  lat: 52.52,
  lng: 13.405,
  capacity: 100,
  occupied: 40,
  price_cents_per_hour: 350,
  type: "garage",
  operator_name: "Example Parking",
};

describe("provider adapter contract", () => {
  it("normalizes trusted inventory fields", () => {
    expect(validateProviderSites("example", [valid])[0]).toMatchObject({
      external_id: "station-1",
      name: "Central Garage",
      occupied: 40,
    });
  });

  it("rejects impossible occupancy and coordinates", () => {
    expect(() => validateProviderSites("example", [{ ...valid, occupied: 101 }])).toThrow(
      /occupancy/,
    );
    expect(() => validateProviderSites("example", [{ ...valid, lat: Number.NaN }])).toThrow(
      /latitude/,
    );
  });

  it("rejects duplicate provider identifiers", () => {
    expect(() => validateProviderSites("example", [valid, valid])).toThrow(/duplicate external ID/);
  });
});
