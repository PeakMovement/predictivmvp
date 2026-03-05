/**
 * Post-processes Yves AI responses for better formatting and readability
 */
export function formatYvesResponse(response: string): string {
  let formatted = response;

  // Step 1: Normalize line breaks (convert multiple newlines to double newlines for paragraphs)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // Step 2: Convert plain list markers to markdown lists
  // Match lines starting with "- " or "* " or "• " that aren't already in markdown format
  formatted = formatted.replace(/^([•\-*])\s+(.+)$/gm, (match, marker, content) => {
    // Capitalize first letter of list item
    const capitalized = content.charAt(0).toUpperCase() + content.slice(1);
    // Ensure proper punctuation at end
    const punctuated = capitalized.match(/[.!?]$/) ? capitalized : capitalized + '.';
    return `- ${punctuated}`;
  });

  // Step 3: Format inline list items (e.g., "oats (complex carbs): description")
  formatted = formatted.replace(/(\w+)\s*\(([^)]+)\):\s*(.+?)(?=[.\n]|$)/gi, (match, item, category, description) => {
    const capitalizedItem = item.charAt(0).toUpperCase() + item.slice(1);
    const capitalizedCategory = category.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    const capitalizedDesc = description.charAt(0).toUpperCase() + description.slice(1);
    const punctuatedDesc = capitalizedDesc.match(/[.!?]$/) ? capitalizedDesc : capitalizedDesc + '.';
    return `**${capitalizedItem} (${capitalizedCategory}):** ${punctuatedDesc}`;
  });

  // Step 4: Ensure sentences end with periods
  formatted = formatted.replace(/([a-z0-9])\s*\n/gi, (match, lastChar) => {
    return lastChar + '.\n';
  });

  // Step 5: Remove double spaces
  formatted = formatted.replace(/  +/g, ' ');

  // Step 6: Clean up unbalanced punctuation (e.g., ".." or "!!")
  formatted = formatted.replace(/([.!?])\1+/g, '$1');

  // Step 7: Add line breaks between paragraphs (ensure double newlines)
  formatted = formatted.replace(/([.!?])\s*\n([A-Z])/g, '$1\n\n$2');

  // Step 8: Capitalize first word of each sentence
  formatted = formatted.replace(/(^|[.!?]\s+)([a-z])/g, (match, punctuation, letter) => {
    return punctuation + letter.toUpperCase();
  });

  return formatted.trim();
}
