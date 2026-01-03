# Auto-Fill Implementation for External Medical Finder Site

Add this code to `predictiv-medic-finder.netlify.app` to enable auto-fill from URL parameters.

## Option 1: Vanilla JavaScript (Add to your main HTML or JS file)

```javascript
// Auto-fill from URL parameters (add to your main page)
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const symptoms = urlParams.get('symptoms');
  
  if (symptoms) {
    // Wait for DOM to be ready
    const fillField = () => {
      const textarea = document.querySelector('textarea[placeholder*="health concern"]') 
                     || document.querySelector('textarea');
      
      if (textarea) {
        textarea.value = decodeURIComponent(symptoms);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        textarea.focus();
        return true;
      }
      return false;
    };

    // Try immediately, then retry if needed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fillField);
    } else if (!fillField()) {
      // Retry for React/Vue apps that render async
      setTimeout(fillField, 100);
      setTimeout(fillField, 500);
    }
  }
})();
```

## Option 2: React Hook (If using React)

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useSymptomsFromUrl() {
  const [searchParams] = useSearchParams();
  const [healthConcern, setHealthConcern] = useState('');

  useEffect(() => {
    const symptoms = searchParams.get('symptoms');
    if (symptoms) {
      setHealthConcern(decodeURIComponent(symptoms));
    }
  }, [searchParams]);

  return { healthConcern, setHealthConcern };
}

// Usage in your form component:
// const { healthConcern, setHealthConcern } = useSymptomsFromUrl();
// <textarea value={healthConcern} onChange={(e) => setHealthConcern(e.target.value)} />
```

## Expected URL Format

The Lovable app sends:
```
https://predictiv-medic-finder.netlify.app?symptoms=encoded_symptom_text&severity=8
```

## Testing

1. Open: `https://predictiv-medic-finder.netlify.app?symptoms=chest%20pain%20and%20shortness%20of%20breath`
2. The "Describe your health concern" field should be pre-filled
