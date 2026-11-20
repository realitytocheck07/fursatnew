// Category groups for /menu (the chips in the filter bar and the list headings). Section names must match food.json / drinks.json exactly.
export type Side = 'food' | 'drinks';
export interface Group { id: string; side: Side; label: string; sections: string[] }

export const FOOD_GROUPS: Group[] = [
  { id: 'f-biryani', side: 'food', label: 'Biryani & rice', sections: ['Biryani & rice'] },
  { id: 'f-starters', side: 'food', label: 'Starters', sections: ['Appetizers', 'Finger bites', 'Regional specials', 'Quick Bites'] },
  { id: 'f-mains', side: 'food', label: 'Mains', sections: ['Mains', 'Asian mains', 'Pasta', 'Pizza'] },
  { id: 'f-breads', side: 'food', label: 'Breads & sides', sections: ['Indian Breads', 'Extras/Sides'] },
  { id: 'f-soups', side: 'food', label: 'Soups & salads', sections: ['Soups', 'Healthy Salads', 'Healthy bowls'] },
  { id: 'f-breakfast', side: 'food', label: 'Breakfast & South Indian', sections: ['All day breakfast', 'South Indian'] },
  { id: 'f-more', side: 'food', label: 'Burgers, kids & specials', sections: ['Sandwiches & burgers', 'Kids menu', "Sreemukhi's special menu"] },
  { id: 'f-desserts', side: 'food', label: 'Desserts & cookies', sections: ['Desserts', 'Cookies'] },
];

export const DRINK_GROUPS: Group[] = [
  { id: 'd-cocktails', side: 'drinks', label: 'Cocktails', sections: ['Silly Classic', 'The Classic', 'Long Island Iced Tea', 'Shooters'] },
  { id: 'd-whisky', side: 'drinks', label: 'Whisky', sections: ['Whisky'] },
  { id: 'd-white', side: 'drinks', label: 'White spirits', sections: ['Vodka', 'Gin', 'Rum', 'Tequila'] },
  { id: 'd-brandy', side: 'drinks', label: 'Brandy & Liqueur', sections: ['Brandy', 'Liqueur'] },
  { id: 'd-winebeer', side: 'drinks', label: 'Wine & Beer', sections: ['Wines', 'Beer'] },
  { id: 'd-mocktails', side: 'drinks', label: 'Mocktails & Soft drinks', sections: ['Mocktails', 'Soft Drinks'] },
  { id: 'd-shakes', side: 'drinks', label: 'Shakes & Smoothies', sections: ['Milk Shakes', 'Smoothies'] },
  { id: 'd-coffee', side: 'drinks', label: 'Coffee & Tea', sections: ['Coffee', 'Tea'] },
];

// Gold line icons for the "Jump to" tiles (24x24, stroke only): one per group, shared by the sections inside it.
export const GROUP_ICONS: Record<string, string> = {
  'f-biryani': 'M3 12h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z M7 12c0-3 2-5 5-5s5 2 5 5 M12 3v2',
  'f-starters': 'M4 20 20 4 M7.5 10.5 10 8l2.5 2.5L10 13z M12.5 14.5 15 12l2.5 2.5L15 17z',
  'f-mains': 'M3 17h18 M5 17a7 7 0 0 1 14 0 M12 8V6 M10.5 6h3',
  'f-breads': 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M8 10c2 1 2 3 0 4 M14 9c2 1 2 3 0 4',
  'f-soups': 'M4 12h16a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z M9 8c-1-1 1-2 0-3 M13 8c-1-1 1-2 0-3 M17 8c-1-1 1-2 0-3',
  'f-breakfast': 'M12 3v2 M5 7l1.5 1.5 M19 7l-1.5 1.5 M12 9a4 4 0 0 1 4 4H8a4 4 0 0 1 4-4z M3 17h18',
  'f-more': 'M4 11a8 6 0 0 1 16 0z M3 14h18 M5 17h14v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z',
  'f-desserts': 'M7 10a5 5 0 0 1 10 0H7z M8 10l4 11 4-11',
  'd-cocktails': 'M4 4h16l-8 9z M12 13v7 M8 20h8',
  'd-whisky': 'M6 5h12l-1 14H7z M7.5 11h9',
  'd-white': 'M10 3h4v4l2 3v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10l2-3z M8 14h8',
  'd-brandy': 'M8 5h8c2 3 2 8-1 10h-6c-3-2-3-7-1-10z M12 15v4 M8.5 19h7',
  'd-winebeer': 'M8 3h8c0 5-1 8-4 8S8 8 8 3z M12 11v8 M8.5 21h7',
  'd-mocktails': 'M7 6h10l-1.5 14h-7z M13 6l2-3 M7.8 11h8.4',
  'd-shakes': 'M6 10h12l-1.5 10h-9z M5 10a7 4 0 0 1 14 0 M13 6l2-3',
  'd-coffee': 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z M16 11h2a2 2 0 0 1 0 4h-2 M9 4v2 M12 4v2',
};
