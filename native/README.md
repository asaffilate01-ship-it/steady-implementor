# ParkPunkt native starters

These projects are implementation foundations, not signed store releases. Read `docs/NATIVE_READINESS.md` before handling authentication, payments or production data.

- `ios/` contains SwiftUI source and an XcodeGen project definition. Install XcodeGen, copy `Config.example.xcconfig` to `Config.xcconfig`, set the browser-safe Supabase values, and run `xcodegen generate`.
- `android/` contains a Jetpack Compose project using AGP 9.3, API 37 and the stable Compose BOM. Copy `local.properties.example` to `local.properties`, add the browser-safe Supabase values, and open the directory in Android Studio.

Both starters implement read-only site discovery through Supabase REST/RPC contracts. Do not put a Supabase service-role key, Stripe secret, provider credential or partner `pk_` key in either app.
