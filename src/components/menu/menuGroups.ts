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
