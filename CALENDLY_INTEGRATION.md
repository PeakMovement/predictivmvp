# Calendly Integration Documentation

This document explains the Calendly booking integration with autofill functionality.

## Overview

The application now supports Calendly-based appointment booking for healthcare providers who have a `calendly_url` configured. When a provider has a Calendly URL, the booking flow automatically uses an embedded Calendly widget instead of the custom booking modal.

## Components

### 1. CalendlyEmbed Component
**Location:** `/src/components/help/CalendlyEmbed.tsx`

Renders an embedded Calendly iframe with automatic data prefilling:
- Prefills user's name from their profile
- Prefills user's email (from profile or localStorage)
- Prefills symptom information from `sessionStorage` if available
- Shows loading state while iframe loads
- Fully responsive design

**Autofill Parameters:**
- `name`: User's full name from profile
- `email`: User's email address
- `a1`: Symptom notes (includes symptom description and severity)

### 2. CalendlyBookingModal Component
**Location:** `/src/components/help/CalendlyBookingModal.tsx`

A dedicated modal that displays the Calendly embed:
- Full-screen modal optimized for booking
- Shows provider name in header
- Contains CalendlyEmbed component

### 3. FindHelp Page Updates
**Location:** `/src/pages/FindHelp.tsx`

Updated to handle Calendly bookings:
- Checks if provider has `calendly_url`
- Shows `CalendlyBookingModal` when Calendly URL exists
- Falls back to `BookingModal` for providers without Calendly

### 4. ProviderDetailModal Updates
**Location:** `/src/components/help/ProviderDetailModal.tsx`

Enhanced to support inline Calendly embed:
- "Book Appointment" button checks for `calendly_url`
- Shows embedded Calendly widget within the modal
- Includes "Back to Details" button to return to provider info
- Seamless user experience without leaving the provider details

## User Flow

### With Calendly Integration:

1. User searches for providers on FindHelp page
2. User selects a provider with `calendly_url`
3. User clicks "Book Appointment"
4. Calendly embed appears with pre-filled information:
   - User's name
   - User's email
   - Symptom information (if navigated from symptom check-in)
5. User completes booking directly through Calendly
6. Booking confirmation is handled by Calendly's webhook (via `/supabase/functions/calendly-webhook`)

### Without Calendly Integration:

1. User searches for providers on FindHelp page
2. User selects a provider without `calendly_url`
3. User clicks "Book Appointment"
4. Custom booking modal appears
5. User fills out booking form
6. Booking is saved to database via `create-booking` function

## Symptom Data Autofill

When users navigate to FindHelp from the Symptom Check-In flow:

1. Symptom data is stored in `sessionStorage` under key `findHelpQuery`
2. Data structure:
   ```json
   {
     "q": "symptom description",
     "severity": "mild/moderate/severe"
   }
   ```
3. CalendlyEmbed reads this data and formats it as:
   ```
   Symptom: [description]
   Severity: [severity level]
   ```
4. This text is passed as the `a1` URL parameter to Calendly

## Database Schema

The `physicians` table includes the `calendly_url` column:
```sql
calendly_url text
```

This column stores the provider's Calendly scheduling URL (e.g., `https://calendly.com/provider-name/appointment-type`).

## Webhook Integration

The Calendly webhook endpoint receives booking confirmations:
**Location:** `/supabase/functions/calendly-webhook/index.ts`

When Calendly completes a booking, it sends a webhook to this endpoint, which:
1. Extracts booking details
2. Saves booking to the `bookings` table
3. Links booking to the user and provider
4. Stores appointment time, notes, and status

## Configuration

To enable Calendly for a provider:

1. Add provider's Calendly URL to the `physicians` table:
   ```sql
   UPDATE physicians
   SET calendly_url = 'https://calendly.com/your-link/30min'
   WHERE id = 'provider-id';
   ```

2. Ensure Calendly webhook is configured to point to:
   ```
   https://[your-supabase-url]/functions/v1/calendly-webhook
   ```

## Benefits

1. **Seamless Integration**: No context switching - booking happens in-app
2. **Data Prefilling**: Reduces user friction with automatic form completion
3. **Professional Scheduling**: Leverages Calendly's robust scheduling features
4. **Reduced Development**: No need to maintain custom scheduling logic
5. **Real-time Availability**: Calendly handles real-time slot management
6. **Automatic Reminders**: Calendly sends booking confirmations and reminders

## Testing

To test the Calendly integration:

1. Navigate to FindHelp page
2. Search for a provider with a `calendly_url`
3. Click "Book Appointment" on any provider card
4. Verify the Calendly embed loads with prefilled data
5. Complete a test booking
6. Verify webhook receives and stores the booking

## Future Enhancements

Potential improvements:
- Add custom Calendly questions for medical intake
- Support multiple appointment types per provider
- Display Calendly availability inline on provider cards
- Sync Calendly bookings with user's calendar
- Add cancellation/rescheduling flows
