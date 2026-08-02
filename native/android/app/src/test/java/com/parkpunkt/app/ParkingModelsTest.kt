package com.parkpunkt.app

import org.junit.Assert.assertEquals
import org.junit.Test

class ParkingModelsTest {
    @Test fun availabilityNeverGoesNegative() {
        val site = ParkingSite("1", "Test", "Street", 0.0, 0.0, 10, 12, 300, null)
        assertEquals(0, site.available)
    }
}
