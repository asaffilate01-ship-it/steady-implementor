package com.parkpunkt.app

data class ParkingSite(
    val id: String,
    val name: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val capacity: Int,
    val occupied: Int,
    val priceCentsPerHour: Int,
    val operatorName: String?,
) {
    val available: Int get() = (capacity - occupied).coerceAtLeast(0)
    val hourlyPrice: String get() = "€%.2f".format(priceCentsPerHour / 100.0)
}

data class TariffQuote(
    val totalCents: Int,
    val parkingCents: Int,
    val serviceFeeCents: Int,
    val chargeableMinutes: Int,
    val cappedByDailyCap: Boolean,
)
