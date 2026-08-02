package com.parkpunkt.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { DiscoveryScreen(SupabaseParkingClient()) } }
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun DiscoveryScreen(client: SupabaseParkingClient) {
    var sites by remember { mutableStateOf<List<ParkingSite>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(client) {
        runCatching { client.listSites() }
            .onSuccess { sites = it; error = null }
            .onFailure { error = "Live parking could not be loaded. ${it.message.orEmpty()}" }
        loading = false
    }
    Scaffold(topBar = { TopAppBar(title = { Text("ParkPunkt") }) }) { padding ->
        when {
            loading -> Column(Modifier.fillMaxSize().padding(padding), verticalArrangement = Arrangement.Center) { CircularProgressIndicator(Modifier.padding(24.dp)) }
            error != null && sites.isEmpty() -> Text(error.orEmpty(), Modifier.padding(padding).padding(24.dp), color = MaterialTheme.colorScheme.error)
            else -> LazyColumn(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { Text("Finden. Parken. Bezahlen.", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(vertical = 12.dp)) }
                items(sites, key = { it.id }) { site -> SiteCard(site) }
            }
        }
    }
}

@Composable
private fun SiteCard(site: ParkingSite) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth()) {
                Text(site.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                Spacer(Modifier.width(12.dp))
                Text(site.hourlyPrice, style = MaterialTheme.typography.titleMedium)
            }
            Text(site.address, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("${site.available} spaces available", style = MaterialTheme.typography.labelMedium, color = if (site.available > 0) Color(0xFF167B4B) else MaterialTheme.colorScheme.error)
        }
    }
}
