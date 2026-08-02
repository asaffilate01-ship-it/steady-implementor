package com.parkpunkt.app

import java.net.HttpURLConnection
import java.net.URI
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray

class SupabaseParkingClient(
    private val baseUrl: String = BuildConfig.SUPABASE_URL,
    private val publishableKey: String = BuildConfig.SUPABASE_PUBLISHABLE_KEY,
) {
    init {
        require(baseUrl.startsWith("https://") && publishableKey.isNotBlank()) {
            "Copy local.properties.example to local.properties and configure publishable Supabase values"
        }
    }

    suspend fun listSites(): List<ParkingSite> = withContext(Dispatchers.IO) {
        val select = "id,name,address,lat,lng,capacity,occupied,price_cents_per_hour,operator_name"
        val url = URI("$baseUrl/rest/v1/sites?select=$select&order=name.asc").toURL()
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8_000
            readTimeout = 8_000
            setRequestProperty("apikey", publishableKey)
            setRequestProperty("Authorization", "Bearer $publishableKey")
        }
        try {
            if (connection.responseCode !in 200..299) error("Parking service returned ${connection.responseCode}")
            val values = JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
            buildList {
                repeat(values.length()) { index ->
                    val value = values.getJSONObject(index)
                    add(ParkingSite(
                        id = value.getString("id"),
                        name = value.getString("name"),
                        address = value.getString("address"),
                        latitude = value.getDouble("lat"),
                        longitude = value.getDouble("lng"),
                        capacity = value.getInt("capacity"),
                        occupied = value.getInt("occupied"),
                        priceCentsPerHour = value.getInt("price_cents_per_hour"),
                        operatorName = value.optString("operator_name").takeIf { it.isNotBlank() },
                    ))
                }
            }
        } finally {
            connection.disconnect()
        }
    }
}
