I will update the **Supabase Edge Function** (`liteapi/index.ts`) to act as a robust abstraction layer for LiteAPI's white-label flow.

**Core Changes:**
1.  **Enhanced `normalizeHotel` Function**:
    *   **Price Logic**: Instead of grabbing the first rate, it will iterate through **all available room types** and find the **lowest valid price**. This ensures prices never fall back to 0 unless the hotel is truly sold out.
    *   **Room Type Support**: It will parse and normalize the full `roomTypes` array (standardizing v3 `roomTypes` and legacy `rooms`), capturing key details:
        *   Room Name & ID
        *   Net & Retail Prices
        *   Board Type (e.g., "Room Only", "Breakfast Included")
        *   Cancellation Policy
    *   **Booking URL**: It will robustly extract the booking URL from the best available rate.

2.  **API Response Structure**:
    *   The `detail` action will now return a `rooms` array within the hotel object, containing the normalized room data. This fulfills the requirement to "Support multiple room types" without forcing immediate UI changes.

3.  **Booking Redirect**:
    *   Ensure the `book` action preserves the logic to generate valid, commissionable links using the server-side API key.

**Files to Modify:**
*   `supabase/functions/liteapi/index.ts`

**Verification:**
*   I will use the `detail` action to verify that a hotel response now includes the correct "cheapest" price (not 0) and a populated `rooms` array.