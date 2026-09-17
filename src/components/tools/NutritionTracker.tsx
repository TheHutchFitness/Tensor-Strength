"use client";

import { useEffect, useMemo, useState } from "react";
import { useCloudState, cloudSet } from "../../lib/cloud";

type Food = { name: string; cuisine: string; cal: number; p: number; c: number; f: number; diets: string[]; perItem?: boolean; serving?: string; source?: "custom" | "recipe" };
type Entry = { id: string; name: string; label: string; cal: number; p: number; c: number; f: number };
type Meal = "breakfast" | "lunch" | "dinner" | "snacks";
type DayLog = Record<Meal, Entry[]>;
type Goal = { calories: number; protein: number; carbs: number; fat: number };
type Unit = "g" | "oz" | "ml" | "l";
type CyclePlan = Record<string, { cal?: number; p?: number; c?: number; f?: number }>;

const LOG_KEY = "ts-nutrition-log";
const GOAL_KEY = "ts-nutrition-goal";
const DIET_KEY = "ts-nutrition-diet";

const MEALS: { id: Meal; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
];

const DIETS = ["balanced", "vegetarian", "vegan", "keto", "carnivore"];

// Common supplements & vitamins with a typical dose / daily-value note.
const COMMON_SUPPS: { name: string; info: string }[] = [
  { name: "Multivitamin", info: "1 tablet · ~100% DV" },
  { name: "Vitamin D3", info: "1000–2000 IU · 100%+ DV" },
  { name: "Vitamin C", info: "500–1000 mg · 100%+ DV" },
  { name: "Vitamin B12", info: "500–1000 mcg" },
  { name: "B-Complex", info: "1 capsule" },
  { name: "Fish Oil (Omega-3)", info: "1–2 g EPA/DHA" },
  { name: "Magnesium", info: "200–400 mg" },
  { name: "Zinc", info: "15–30 mg" },
  { name: "Calcium", info: "500–1000 mg" },
  { name: "Iron", info: "18 mg · 100% DV" },
  { name: "Creatine", info: "5 g daily" },
  { name: "Probiotic", info: "1 capsule" },
  { name: "Vitamin K2", info: "100 mcg" },
  { name: "Ashwagandha", info: "300–600 mg" },
];
const CUISINES = ["all", "general", "american", "indian", "mexican", "chinese", "takeout", "mcdonalds", "timhortons", "brands"];

// Macros are per 100 g / 100 ml.
const FOODS: Food[] = [
  // General / staples
  { name: "Chicken Breast", cuisine: "general", cal: 165, p: 31, c: 0, f: 3.6, diets: ["keto", "carnivore"] },
  { name: "Salmon", cuisine: "general", cal: 208, p: 20, c: 0, f: 13, diets: ["keto", "carnivore"] },
  { name: "Whole Egg", cuisine: "general", cal: 143, p: 13, c: 1.1, f: 9.5, diets: ["vegetarian", "keto", "carnivore"] },
  { name: "Greek Yogurt (plain)", cuisine: "general", cal: 59, p: 10, c: 3.6, f: 0.4, diets: ["vegetarian", "keto"] },
  { name: "Whey Protein", cuisine: "general", cal: 400, p: 80, c: 10, f: 5, diets: ["vegetarian", "keto"] },
  { name: "Almonds", cuisine: "general", cal: 579, p: 21, c: 22, f: 50, diets: ["vegan", "vegetarian", "keto"] },
  { name: "White Rice (cooked)", cuisine: "general", cal: 130, p: 2.7, c: 28, f: 0.3, diets: ["vegan", "vegetarian"] },
  { name: "Oats (dry)", cuisine: "general", cal: 389, p: 17, c: 66, f: 7, diets: ["vegan", "vegetarian"] },
  { name: "Banana", cuisine: "general", cal: 89, p: 1.1, c: 23, f: 0.3, diets: ["vegan", "vegetarian"] },
  { name: "Sweet Potato", cuisine: "general", cal: 86, p: 1.6, c: 20, f: 0.1, diets: ["vegan", "vegetarian"] },
  { name: "Broccoli", cuisine: "general", cal: 34, p: 2.8, c: 7, f: 0.4, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Avocado", cuisine: "general", cal: 160, p: 2, c: 9, f: 15, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Olive Oil", cuisine: "general", cal: 884, p: 0, c: 0, f: 100, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Ground Beef (80/20)", cuisine: "general", cal: 254, p: 17, c: 0, f: 20, diets: ["keto", "carnivore"] },
  { name: "Sirloin Steak", cuisine: "general", cal: 206, p: 26, c: 0, f: 11, diets: ["keto", "carnivore"] },
  { name: "Tofu", cuisine: "general", cal: 76, p: 8, c: 1.9, f: 4.8, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Black Beans", cuisine: "general", cal: 132, p: 8.9, c: 24, f: 0.5, diets: ["vegan", "vegetarian"] },
  { name: "Peanut Butter", cuisine: "general", cal: 588, p: 25, c: 20, f: 50, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Cheddar Cheese", cuisine: "general", cal: 402, p: 25, c: 1.3, f: 33, diets: ["vegetarian", "keto", "carnivore"] },
  { name: "Milk (2%)", cuisine: "general", cal: 50, p: 3.4, c: 4.8, f: 2, diets: ["vegetarian"] },
  { name: "Cottage Cheese", cuisine: "general", cal: 98, p: 11, c: 3.4, f: 4.3, diets: ["vegetarian", "keto"] },
  { name: "Tuna (canned)", cuisine: "general", cal: 116, p: 26, c: 0, f: 1, diets: ["keto", "carnivore"] },
  // American
  { name: "Cheeseburger", cuisine: "american", cal: 254, p: 13, c: 19, f: 13, diets: [] },
  { name: "Hot Dog", cuisine: "american", cal: 290, p: 10, c: 4, f: 26, diets: ["keto"] },
  { name: "Pancakes", cuisine: "american", cal: 227, p: 6, c: 28, f: 9, diets: ["vegetarian"] },
  { name: "BBQ Ribs", cuisine: "american", cal: 292, p: 22, c: 8, f: 19, diets: ["keto"] },
  { name: "Mac & Cheese", cuisine: "american", cal: 164, p: 6, c: 20, f: 6, diets: ["vegetarian"] },
  { name: "Buffalo Wings", cuisine: "american", cal: 285, p: 27, c: 1, f: 19, diets: ["keto", "carnivore"] },
  { name: "Caesar Salad w/ Chicken", cuisine: "american", cal: 190, p: 12, c: 6, f: 13, diets: ["keto"] },
  { name: "Grilled Cheese", cuisine: "american", cal: 350, p: 12, c: 28, f: 22, diets: ["vegetarian"] },
  { name: "Bacon", cuisine: "american", cal: 541, p: 37, c: 1.4, f: 42, diets: ["keto", "carnivore"] },
  { name: "Fried Chicken", cuisine: "american", cal: 246, p: 24, c: 8, f: 14, diets: [] },
  { name: "Meatloaf", cuisine: "american", cal: 210, p: 16, c: 8, f: 12, diets: [] },
  // Indian
  { name: "Butter Chicken", cuisine: "indian", cal: 180, p: 12, c: 6, f: 12, diets: ["keto"] },
  { name: "Chicken Tikka Masala", cuisine: "indian", cal: 155, p: 11, c: 6, f: 9, diets: [] },
  { name: "Paneer Tikka", cuisine: "indian", cal: 270, p: 16, c: 6, f: 20, diets: ["vegetarian", "keto"] },
  { name: "Dal (Lentil Curry)", cuisine: "indian", cal: 116, p: 6, c: 16, f: 3, diets: ["vegan", "vegetarian"] },
  { name: "Chana Masala", cuisine: "indian", cal: 130, p: 6, c: 18, f: 4, diets: ["vegan", "vegetarian"] },
  { name: "Palak Paneer", cuisine: "indian", cal: 180, p: 9, c: 8, f: 13, diets: ["vegetarian", "keto"] },
  { name: "Naan", cuisine: "indian", cal: 310, p: 9, c: 50, f: 8, diets: ["vegetarian"] },
  { name: "Tandoori Chicken", cuisine: "indian", cal: 150, p: 25, c: 2, f: 5, diets: ["keto", "carnivore"] },
  { name: "Aloo Gobi", cuisine: "indian", cal: 100, p: 3, c: 14, f: 4, diets: ["vegan", "vegetarian"] },
  { name: "Chicken Biryani", cuisine: "indian", cal: 180, p: 9, c: 24, f: 6, diets: [] },
  { name: "Samosa", cuisine: "indian", cal: 262, p: 4, c: 32, f: 13, diets: ["vegan", "vegetarian"] },
  // Mexican
  { name: "Chicken Burrito", cuisine: "mexican", cal: 206, p: 12, c: 24, f: 7, diets: [] },
  { name: "Beef Taco", cuisine: "mexican", cal: 226, p: 9, c: 20, f: 13, diets: [] },
  { name: "Guacamole", cuisine: "mexican", cal: 160, p: 2, c: 9, f: 15, diets: ["vegan", "vegetarian", "keto"] },
  { name: "Cheese Quesadilla", cuisine: "mexican", cal: 300, p: 13, c: 26, f: 16, diets: ["vegetarian"] },
  { name: "Carnitas", cuisine: "mexican", cal: 275, p: 20, c: 1, f: 21, diets: ["keto", "carnivore"] },
  { name: "Refried Beans", cuisine: "mexican", cal: 120, p: 7, c: 20, f: 2, diets: ["vegan", "vegetarian"] },
  { name: "Chicken Fajitas", cuisine: "mexican", cal: 150, p: 14, c: 8, f: 7, diets: ["keto"] },
  { name: "Nachos", cuisine: "mexican", cal: 343, p: 8, c: 35, f: 19, diets: ["vegetarian"] },
  { name: "Beef Enchiladas", cuisine: "mexican", cal: 180, p: 10, c: 18, f: 8, diets: [] },
  { name: "Salsa", cuisine: "mexican", cal: 36, p: 1.5, c: 7, f: 0.2, diets: ["vegan", "vegetarian", "keto"] },
  // Chinese
  { name: "Kung Pao Chicken", cuisine: "chinese", cal: 185, p: 13, c: 9, f: 11, diets: [] },
  { name: "Veg Fried Rice", cuisine: "chinese", cal: 163, p: 5, c: 23, f: 5, diets: ["vegetarian"] },
  { name: "Beef & Broccoli", cuisine: "chinese", cal: 150, p: 12, c: 8, f: 8, diets: ["keto"] },
  { name: "Sweet & Sour Pork", cuisine: "chinese", cal: 250, p: 9, c: 30, f: 10, diets: [] },
  { name: "Veg Spring Roll", cuisine: "chinese", cal: 210, p: 5, c: 25, f: 10, diets: ["vegan", "vegetarian"] },
  { name: "Pork Dumplings", cuisine: "chinese", cal: 220, p: 9, c: 25, f: 9, diets: [] },
  { name: "General Tso's Chicken", cuisine: "chinese", cal: 250, p: 12, c: 28, f: 10, diets: [] },
  { name: "Chow Mein", cuisine: "chinese", cal: 200, p: 7, c: 25, f: 8, diets: ["vegetarian"] },
  { name: "Mapo Tofu", cuisine: "chinese", cal: 150, p: 9, c: 6, f: 10, diets: ["vegetarian", "keto"] },
  { name: "Wonton Soup", cuisine: "chinese", cal: 90, p: 6, c: 10, f: 3, diets: [] },
  // Takeout / popular
  { name: "Pepperoni Pizza", cuisine: "takeout", cal: 298, p: 13, c: 34, f: 12, diets: [] },
  { name: "Cheese Pizza", cuisine: "takeout", cal: 266, p: 11, c: 33, f: 10, diets: ["vegetarian"] },
  { name: "French Fries", cuisine: "takeout", cal: 312, p: 3.4, c: 41, f: 15, diets: ["vegan", "vegetarian"] },
  { name: "California Sushi Roll", cuisine: "takeout", cal: 130, p: 4, c: 24, f: 2, diets: [] },
  { name: "Chicken Shawarma", cuisine: "takeout", cal: 190, p: 17, c: 8, f: 10, diets: ["keto"] },
  { name: "Falafel", cuisine: "takeout", cal: 333, p: 13, c: 32, f: 18, diets: ["vegan", "vegetarian"] },
  { name: "Pad Thai", cuisine: "takeout", cal: 200, p: 9, c: 28, f: 6, diets: [] },
  { name: "Doner Kebab", cuisine: "takeout", cal: 215, p: 15, c: 10, f: 12, diets: ["keto"] },
  { name: "Fish & Chips", cuisine: "takeout", cal: 280, p: 12, c: 28, f: 14, diets: [] },
  { name: "Burrito Bowl", cuisine: "takeout", cal: 170, p: 10, c: 18, f: 6, diets: [] },

  // ===== McDONALD'S (per item) =====
  { name: "McD Big Mac", cuisine: "mcdonalds", cal: 550, p: 25, c: 45, f: 30, diets: [], perItem: true, serving: "1 burger" },
  { name: "McD Quarter Pounder w/ Cheese", cuisine: "mcdonalds", cal: 520, p: 30, c: 42, f: 26, diets: [], perItem: true, serving: "1 burger" },
  { name: "McD Double Quarter Pounder", cuisine: "mcdonalds", cal: 740, p: 48, c: 43, f: 42, diets: [], perItem: true, serving: "1 burger" },
  { name: "McD Cheeseburger", cuisine: "mcdonalds", cal: 300, p: 15, c: 32, f: 13, diets: [], perItem: true, serving: "1 burger" },
  { name: "McD Double Cheeseburger", cuisine: "mcdonalds", cal: 450, p: 25, c: 34, f: 24, diets: [], perItem: true, serving: "1 burger" },
  { name: "McD Hamburger", cuisine: "mcdonalds", cal: 250, p: 12, c: 31, f: 9, diets: [], perItem: true, serving: "1 burger" },
  { name: "McD McChicken", cuisine: "mcdonalds", cal: 400, p: 14, c: 39, f: 21, diets: [], perItem: true, serving: "1 sandwich" },
  { name: "McD McCrispy Chicken", cuisine: "mcdonalds", cal: 470, p: 27, c: 46, f: 20, diets: [], perItem: true, serving: "1 sandwich" },
  { name: "McD Filet-O-Fish", cuisine: "mcdonalds", cal: 390, p: 16, c: 39, f: 19, diets: [], perItem: true, serving: "1 sandwich" },
  { name: "McD 10 pc Chicken McNuggets", cuisine: "mcdonalds", cal: 410, p: 23, c: 26, f: 24, diets: [], perItem: true, serving: "10 pc" },
  { name: "McD 6 pc Chicken McNuggets", cuisine: "mcdonalds", cal: 250, p: 14, c: 16, f: 15, diets: [], perItem: true, serving: "6 pc" },
  { name: "McD Fries (Medium)", cuisine: "mcdonalds", cal: 320, p: 4, c: 43, f: 15, diets: ["vegetarian", "vegan"], perItem: true, serving: "medium" },
  { name: "McD Fries (Large)", cuisine: "mcdonalds", cal: 480, p: 6, c: 65, f: 23, diets: ["vegetarian", "vegan"], perItem: true, serving: "large" },
  { name: "McD Egg McMuffin", cuisine: "mcdonalds", cal: 310, p: 17, c: 30, f: 13, diets: ["vegetarian"], perItem: true, serving: "1 muffin" },
  { name: "McD Sausage McMuffin w/ Egg", cuisine: "mcdonalds", cal: 480, p: 20, c: 30, f: 31, diets: [], perItem: true, serving: "1 muffin" },
  { name: "McD Hotcakes", cuisine: "mcdonalds", cal: 580, p: 9, c: 101, f: 15, diets: ["vegetarian"], perItem: true, serving: "3 cakes" },
  { name: "McD Hash Brown", cuisine: "mcdonalds", cal: 140, p: 1, c: 15, f: 8, diets: ["vegetarian", "vegan"], perItem: true, serving: "1 piece" },
  { name: "McD Sausage Burrito", cuisine: "mcdonalds", cal: 310, p: 12, c: 26, f: 17, diets: [], perItem: true, serving: "1 burrito" },
  { name: "McD McFlurry Oreo", cuisine: "mcdonalds", cal: 510, p: 12, c: 80, f: 16, diets: ["vegetarian"], perItem: true, serving: "regular" },
  { name: "McD Vanilla Cone", cuisine: "mcdonalds", cal: 200, p: 5, c: 32, f: 5, diets: ["vegetarian"], perItem: true, serving: "1 cone" },
  { name: "McD Apple Pie", cuisine: "mcdonalds", cal: 230, p: 2, c: 33, f: 11, diets: ["vegetarian"], perItem: true, serving: "1 pie" },
  { name: "McD Coca-Cola (Medium)", cuisine: "mcdonalds", cal: 210, p: 0, c: 58, f: 0, diets: ["vegan", "vegetarian"], perItem: true, serving: "medium" },
  { name: "McD Iced Coffee", cuisine: "mcdonalds", cal: 140, p: 2, c: 24, f: 4, diets: ["vegetarian"], perItem: true, serving: "medium" },
  { name: "McD McCafé Latte", cuisine: "mcdonalds", cal: 190, p: 9, c: 18, f: 9, diets: ["vegetarian"], perItem: true, serving: "medium" },

  // ===== TIM HORTONS (per item) =====
  { name: "Tim Coffee (Double-Double, M)", cuisine: "timhortons", cal: 160, p: 4, c: 22, f: 6, diets: ["vegetarian"], perItem: true, serving: "medium" },
  { name: "Tim Coffee (Black)", cuisine: "timhortons", cal: 5, p: 0, c: 1, f: 0, diets: ["vegan", "vegetarian"], perItem: true, serving: "medium" },
  { name: "Tim French Vanilla", cuisine: "timhortons", cal: 250, p: 3, c: 40, f: 8, diets: ["vegetarian"], perItem: true, serving: "medium" },
  { name: "Tim Iced Capp", cuisine: "timhortons", cal: 300, p: 4, c: 46, f: 11, diets: ["vegetarian"], perItem: true, serving: "medium" },
  { name: "Tim Latte", cuisine: "timhortons", cal: 180, p: 9, c: 17, f: 8, diets: ["vegetarian"], perItem: true, serving: "medium" },
  { name: "Tim Boston Cream Donut", cuisine: "timhortons", cal: 250, p: 4, c: 35, f: 10, diets: ["vegetarian"], perItem: true, serving: "1 donut" },
  { name: "Tim Honey Dip Donut", cuisine: "timhortons", cal: 210, p: 4, c: 33, f: 8, diets: ["vegetarian"], perItem: true, serving: "1 donut" },
  { name: "Tim Chocolate Dip Donut", cuisine: "timhortons", cal: 230, p: 4, c: 34, f: 9, diets: ["vegetarian"], perItem: true, serving: "1 donut" },
  { name: "Tim Apple Fritter", cuisine: "timhortons", cal: 300, p: 5, c: 49, f: 10, diets: ["vegetarian"], perItem: true, serving: "1 fritter" },
  { name: "Tim Timbits (10)", cuisine: "timhortons", cal: 660, p: 8, c: 90, f: 30, diets: ["vegetarian"], perItem: true, serving: "10 timbits" },
  { name: "Tim Plain Bagel", cuisine: "timhortons", cal: 280, p: 10, c: 56, f: 2, diets: ["vegan", "vegetarian"], perItem: true, serving: "1 bagel" },
  { name: "Tim Bagel B.E.L.T.", cuisine: "timhortons", cal: 450, p: 20, c: 58, f: 16, diets: [], perItem: true, serving: "1 bagel" },
  { name: "Tim Bacon Farmer's Wrap", cuisine: "timhortons", cal: 480, p: 18, c: 48, f: 24, diets: [], perItem: true, serving: "1 wrap" },
  { name: "Tim Sausage Farmer's Wrap", cuisine: "timhortons", cal: 610, p: 20, c: 49, f: 37, diets: [], perItem: true, serving: "1 wrap" },
  { name: "Tim Chicken Wrap Snacker", cuisine: "timhortons", cal: 280, p: 12, c: 30, f: 12, diets: [], perItem: true, serving: "1 wrap" },
  { name: "Tim Turkey Bacon Club", cuisine: "timhortons", cal: 470, p: 30, c: 52, f: 15, diets: [], perItem: true, serving: "1 sandwich" },
  { name: "Tim Chili (Medium)", cuisine: "timhortons", cal: 280, p: 22, c: 24, f: 11, diets: [], perItem: true, serving: "medium" },
  { name: "Tim Chicken Noodle Soup", cuisine: "timhortons", cal: 110, p: 6, c: 18, f: 2, diets: [], perItem: true, serving: "medium" },
  { name: "Tim Blueberry Muffin", cuisine: "timhortons", cal: 360, p: 6, c: 55, f: 13, diets: ["vegetarian"], perItem: true, serving: "1 muffin" },
  { name: "Tim Chocolate Chip Muffin", cuisine: "timhortons", cal: 430, p: 6, c: 62, f: 18, diets: ["vegetarian"], perItem: true, serving: "1 muffin" },

  // ===== CEREALS (per bowl ~1 cup) =====
  { name: "Cheerios (1 cup)", cuisine: "brands", cal: 140, p: 5, c: 29, f: 3, diets: ["vegetarian"], perItem: true, serving: "1 cup" },
  { name: "Frosted Flakes (1 cup)", cuisine: "brands", cal: 130, p: 2, c: 32, f: 0, diets: ["vegetarian", "vegan"], perItem: true, serving: "1 cup" },
  { name: "Special K (1 cup)", cuisine: "brands", cal: 120, p: 6, c: 27, f: 1, diets: ["vegetarian"], perItem: true, serving: "1 cup" },
  { name: "Raisin Bran (1 cup)", cuisine: "brands", cal: 190, p: 5, c: 46, f: 1.5, diets: ["vegetarian", "vegan"], perItem: true, serving: "1 cup" },
  { name: "Froot Loops (1 cup)", cuisine: "brands", cal: 150, p: 2, c: 34, f: 1.5, diets: ["vegetarian", "vegan"], perItem: true, serving: "1 cup" },
  { name: "Corn Flakes (1 cup)", cuisine: "brands", cal: 100, p: 2, c: 24, f: 0, diets: ["vegetarian", "vegan"], perItem: true, serving: "1 cup" },
  { name: "Granola (1/2 cup)", cuisine: "brands", cal: 230, p: 5, c: 37, f: 8, diets: ["vegetarian", "vegan"], perItem: true, serving: "1/2 cup" },
  { name: "Oatmeal (1 packet)", cuisine: "brands", cal: 150, p: 4, c: 27, f: 3, diets: ["vegetarian", "vegan"], perItem: true, serving: "1 packet" },

  // ===== MILK (per cup ~250 ml) =====
  { name: "Whole Milk (1 cup)", cuisine: "brands", cal: 150, p: 8, c: 12, f: 8, diets: ["vegetarian"], perItem: true, serving: "1 cup" },
  { name: "2% Milk (1 cup)", cuisine: "brands", cal: 120, p: 8, c: 12, f: 5, diets: ["vegetarian"], perItem: true, serving: "1 cup" },
  { name: "Skim Milk (1 cup)", cuisine: "brands", cal: 80, p: 8, c: 12, f: 0, diets: ["vegetarian"], perItem: true, serving: "1 cup" },
  { name: "Almond Milk unsw. (1 cup)", cuisine: "brands", cal: 30, p: 1, c: 1, f: 2.5, diets: ["vegan", "vegetarian", "keto"], perItem: true, serving: "1 cup" },
  { name: "Oat Milk (1 cup)", cuisine: "brands", cal: 120, p: 3, c: 16, f: 5, diets: ["vegan", "vegetarian"], perItem: true, serving: "1 cup" },
  { name: "Soy Milk (1 cup)", cuisine: "brands", cal: 100, p: 7, c: 8, f: 4, diets: ["vegan", "vegetarian"], perItem: true, serving: "1 cup" },

  // ===== ENERGY DRINKS (per can) =====
  { name: "Red Bull (250ml)", cuisine: "brands", cal: 110, p: 1, c: 28, f: 0, diets: ["vegetarian"], perItem: true, serving: "1 can" },
  { name: "Red Bull Sugarfree", cuisine: "brands", cal: 5, p: 0, c: 1, f: 0, diets: ["vegan", "vegetarian", "keto"], perItem: true, serving: "1 can" },
  { name: "Monster Energy (473ml)", cuisine: "brands", cal: 210, p: 0, c: 54, f: 0, diets: ["vegan", "vegetarian"], perItem: true, serving: "1 can" },
  { name: "Monster Zero Ultra", cuisine: "brands", cal: 10, p: 0, c: 2, f: 0, diets: ["vegan", "vegetarian", "keto"], perItem: true, serving: "1 can" },
  { name: "Celsius", cuisine: "brands", cal: 10, p: 0, c: 2, f: 0, diets: ["vegan", "vegetarian", "keto"], perItem: true, serving: "1 can" },
  { name: "Rockstar Energy", cuisine: "brands", cal: 250, p: 0, c: 63, f: 0, diets: ["vegan", "vegetarian"], perItem: true, serving: "1 can" },
  { name: "Prime Energy", cuisine: "brands", cal: 20, p: 0, c: 5, f: 0, diets: ["vegan", "vegetarian", "keto"], perItem: true, serving: "1 can" },
  { name: "Bang Energy", cuisine: "brands", cal: 0, p: 0, c: 0, f: 0, diets: ["vegan", "vegetarian", "keto"], perItem: true, serving: "1 can" },

  // ===== PROTEIN POWDERS (per scoop) =====
  { name: "Whey Isolate (1 scoop)", cuisine: "brands", cal: 120, p: 25, c: 3, f: 1, diets: ["vegetarian", "keto"], perItem: true, serving: "1 scoop" },
  { name: "Whey Concentrate (1 scoop)", cuisine: "brands", cal: 150, p: 24, c: 5, f: 3, diets: ["vegetarian"], perItem: true, serving: "1 scoop" },
  { name: "Casein (1 scoop)", cuisine: "brands", cal: 120, p: 24, c: 4, f: 1, diets: ["vegetarian"], perItem: true, serving: "1 scoop" },
  { name: "Vegan Pea Protein (1 scoop)", cuisine: "brands", cal: 120, p: 24, c: 4, f: 2, diets: ["vegan", "vegetarian"], perItem: true, serving: "1 scoop" },
  { name: "Mass Gainer (1 scoop)", cuisine: "brands", cal: 380, p: 30, c: 60, f: 4, diets: ["vegetarian"], perItem: true, serving: "1 scoop" },
  { name: "Clear Whey (1 scoop)", cuisine: "brands", cal: 90, p: 20, c: 1, f: 0, diets: ["vegetarian", "keto"], perItem: true, serving: "1 scoop" },
];

function uid() {
  return Math.random().toString(36).slice(2);
}
function dateKey(d: Date) {
  // Nutrition belongs to the member's local calendar, not UTC. This keeps an
  // evening meal from being assigned to tomorrow in Canada and similar zones.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function emptyDay(): DayLog {
  return { breakfast: [], lunch: [], dinner: [], snacks: [] };
}
function round(n: number) {
  return Math.round(n * 10) / 10;
}
function gramsOf(amount: number, unit: Unit) {
  if (unit === "oz") return amount * 28.3495;
  if (unit === "l") return amount * 1000;
  return amount; // g and ml ~1:1
}

export default function NutritionTracker() {
  const [allLogs, setAllLogs, logsReady] = useCloudState<Record<string, DayLog>>(LOG_KEY, {});
  const [goal, setGoal] = useState<Goal>({ calories: 2200, protein: 170, carbs: 220, fat: 70 });
  const [date, setDate] = useState<Date>(new Date());
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState<Goal>(goal);
  const [diet, setDiet] = useCloudState<string>(DIET_KEY, "balanced");
  const [customFoods] = useCloudState<{ id: string; name: string; cal: number; p: number; c: number; f: number }[]>("ts-custom-foods", []);
  const [recipes] = useCloudState<{ id: string; name: string; per: { cal: number; p: number; c: number; f: number } }[]>("ts-recipes", []);
  const [cyclePlan] = useCloudState<CyclePlan>("ts-macro-cycle", {});
  const [favorites, setFavorites] = useCloudState<string[]>("ts-nutrition-favorites", []);
  const [addTo, setAddTo] = useState<Meal | null>(null);
  const [amount, setAmount] = useState("100");
  const [unit, setUnit] = useState<Unit>("g");
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState("all");
  const [manual, setManual] = useState({ name: "", cal: "", p: "", c: "", f: "" });
  const [supps, setSupps, suppsReady] = useCloudState<Record<string, string[]>>("ts-supp-log", {});
  const [customSupps, setCustomSupps] = useCloudState<string[]>("ts-supp-custom", []);
  const [newSupp, setNewSupp] = useState("");
  const [savedMeals, setSavedMeals] = useCloudState<{ id: string; name: string; items: Entry[] }[]>("ts-saved-meals", []);
  const [coachMeals, setCoachMeals] = useState<{ id: string; name: string; items: Entry[] }[]>([]);
  const [coachGoalNote, setCoachGoalNote] = useState("");
  const [goalsReady, setGoalsReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editingEntry, setEditingEntry] = useState<{ meal: Meal; id: string; draft: Entry } | null>(null);

  useEffect(() => {
    fetch("/api/client/meals")
      .then((r) => (r.ok ? r.json() : { meals: [] }))
      .then((d) => setCoachMeals(d.meals || []))
      .catch(() => {});
  }, []);

  // Hydrate the member's saved goal from the cloud store, then let the coach's
  // pushed targets override it if they're newer (tracked by a synced marker).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/client/store?key=${encodeURIComponent(GOAL_KEY)}`);
        if (res.ok) {
          const d = await res.json();
          if (d.found && d.value) { setGoal(d.value); setGoalDraft(d.value); }
        }
      } catch {}
      try {
        const res = await fetch("/api/client/coach-goal");
        if (!res.ok) return;
        const d = await res.json();
        const g = d?.goal;
        if (!g || !g.setAt) return;
        let marker: string | null = null;
        try {
          const mr = await fetch(`/api/client/store?key=${encodeURIComponent("ts-nutrition-coach-at")}`);
          if (mr.ok) { const md = await mr.json(); marker = md.found ? md.value : null; }
        } catch {}
        if (marker === g.setAt) return;
        const next = {
          calories: Number(g.calories) || 0,
          protein: Number(g.protein) || 0,
          carbs: Number(g.carbs) || 0,
          fat: Number(g.fat) || 0,
        };
        setGoal(next);
        setGoalDraft(next);
        cloudSet(GOAL_KEY, next);
        cloudSet("ts-nutrition-coach-at", g.setAt);
        setCoachGoalNote(`Your coach${g.setByName ? " (" + g.setByName + ")" : ""} set these targets.`);
      } catch {}
    })().finally(() => setGoalsReady(true));
  }, []);

  const key = dateKey(date);
  const day = allLogs[key] || emptyDay();
  const cycleDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()];
  const dayCycle = cyclePlan[cycleDay] || {};
  const activeGoal: Goal = {
    calories: Number(dayCycle.cal) || goal.calories,
    protein: Number(dayCycle.p) || goal.protein,
    carbs: Number(dayCycle.c) || goal.carbs,
    fat: Number(dayCycle.f) || goal.fat,
  };
  const cycleActive = Object.values(dayCycle).some((value) => Number(value) > 0);

  function persist(next: Record<string, DayLog>) {
    setAllLogs(next);
  }
  function addEntry(meal: Meal, entry: Entry) {
    const next = { ...allLogs, [key]: { ...emptyDay(), ...(allLogs[key] || {}) } };
    next[key][meal] = [...next[key][meal], entry];
    persist(next);
  }
  function removeEntry(meal: Meal, id: string) {
    if (!allLogs[key]) return;
    const next = { ...allLogs, [key]: { ...allLogs[key] } };
    next[key][meal] = next[key][meal].filter((f) => f.id !== id);
    persist(next);
  }

  function updateEntry(meal: Meal, id: string, entry: Entry) {
    if (!allLogs[key]) return;
    const next = { ...allLogs, [key]: { ...allLogs[key] } };
    next[key][meal] = next[key][meal].map((item) => item.id === id ? entry : item);
    persist(next);
    setEditingEntry(null);
  }

  function addFoodToMeal(meal: Meal, food: Food) {
    // Branded / menu items are logged as one whole serving (not scaled by grams).
    if (food.perItem) {
      addEntry(meal, {
        id: uid(),
        name: food.name,
        label: food.serving || "1 serving",
        cal: food.cal,
        p: food.p,
        c: food.c,
        f: food.f,
      });
      return;
    }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    const factor = gramsOf(amt, unit) / 100;
    addEntry(meal, {
      id: uid(),
      name: food.name,
      label: `${amt}${unit}`,
      cal: round(food.cal * factor),
      p: round(food.p * factor),
      c: round(food.c * factor),
      f: round(food.f * factor),
    });
  }

  function addManual(meal: Meal) {
    if (!manual.name.trim()) return;
    const amt = parseFloat(amount) || 0;
    addEntry(meal, {
      id: uid(),
      name: manual.name.trim(),
      label: amt ? `${amt}${unit}` : "",
      cal: parseFloat(manual.cal) || 0,
      p: parseFloat(manual.p) || 0,
      c: parseFloat(manual.c) || 0,
      f: parseFloat(manual.f) || 0,
    });
    setManual({ name: "", cal: "", p: "", c: "", f: "" });
  }

  function toggleFavorite(name: string) {
    setFavorites((items) => items.includes(name) ? items.filter((item) => item !== name) : [...items, name]);
  }

  function saveGoal() {
    setGoal(goalDraft);
    cloudSet(GOAL_KEY, goalDraft);
    setEditingGoal(false);
  }
  function changeDiet(d: string) {
    setDiet(d);
  }

  const takenToday = supps[key] || [];
  function toggleSupp(name: string) {
    const current = supps[key] || [];
    const next = {
      ...supps,
      [key]: current.includes(name) ? current.filter((x) => x !== name) : [...current, name],
    };
    setSupps(next);
  }
  function addCustomSupp() {
    const n = newSupp.trim();
    if (!n || customSupps.includes(n) || COMMON_SUPPS.some((s) => s.name === n)) {
      setNewSupp("");
      return;
    }
    const next = [...customSupps, n];
    setCustomSupps(next);
    toggleSupp(n);
    setNewSupp("");
  }

  function saveMeal(meal: Meal) {
    const items = day[meal];
    if (!items.length) return;
    const name = typeof window !== "undefined" ? window.prompt("Name this meal (e.g. 'Post-workout shake')") : "";
    if (!name || !name.trim()) return;
    const next = [...savedMeals, { id: uid(), name: name.trim(), items }];
    setSavedMeals(next);
  }
  function applyMeal(meal: Meal, sm: { items: Entry[] }) {
    const next = { ...allLogs, [key]: { ...emptyDay(), ...(allLogs[key] || {}) } };
    next[key][meal] = [...next[key][meal], ...sm.items.map((it) => ({ ...it, id: uid() }))];
    persist(next);
  }
  function deleteMeal(id: string) {
    const next = savedMeals.filter((m) => m.id !== id);
    setSavedMeals(next);
  }

  // Weekly summary (last 7 days) computed from the local log.
  const weekly = useMemo(() => {
    let cal = 0, p = 0, c = 0, f = 0, days = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);
      const dl = allLogs[dateKey(d)];
      if (!dl) continue;
      let dc = 0, dp = 0, dcarb = 0, df = 0, any = false;
      (Object.keys(dl) as Meal[]).forEach((m) => dl[m].forEach((e) => { dc += e.cal; dp += e.p; dcarb += e.c; df += e.f; any = true; }));
      if (any) { cal += dc; p += dp; c += dcarb; f += df; days++; }
    }
    return days ? { days, cal: Math.round(cal / days), p: Math.round(p / days), c: Math.round(c / days), f: Math.round(f / days) } : null;
  }, [allLogs, date]);

  const totals = useMemo(() => {
    const t = { cal: 0, p: 0, c: 0, f: 0 };
    (Object.keys(day) as Meal[]).forEach((m) => day[m].forEach((e) => {
      t.cal += e.cal; t.p += e.p; t.c += e.c; t.f += e.f;
    }));
    return t;
  }, [day]);

  const allFoods = useMemo<Food[]>(() => {
    const combined: Food[] = [
      ...FOODS,
      ...customFoods.map((food) => ({ ...food, cuisine: "custom", diets: [], perItem: true, serving: "1 serving", source: "custom" as const })),
      ...recipes.map((recipe) => ({ name: recipe.name, cuisine: "recipe", diets: [], perItem: true, serving: "1 serving", source: "recipe" as const, ...recipe.per })),
    ];
    return Array.from(new Map(combined.map((food) => [food.name.toLowerCase(), food])).values());
  }, [customFoods, recipes]);

  const foodList = useMemo(() => {
    return allFoods.filter((f) => {
      if (diet !== "balanced" && f.diets.length > 0 && !f.diets.includes(diet)) return false;
      if (cuisine !== "all" && f.cuisine !== cuisine && f.cuisine !== "custom" && f.cuisine !== "recipe") return false;
      if (search.trim() && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allFoods, diet, cuisine, search]);

  const favoriteFoods = useMemo(() => allFoods.filter((food) => favorites.includes(food.name)).slice(0, 10), [allFoods, favorites]);
  const recentFoods = useMemo(() => {
    const seen = new Set<string>();
    const entries: Entry[] = [];
    Object.keys(allLogs).sort((a, b) => b.localeCompare(a)).forEach((dayKey) => {
      (Object.values(allLogs[dayKey]) as Entry[][]).flat().forEach((entry) => {
        const id = entry.name.toLowerCase();
        if (!seen.has(id) && entries.length < 10) { seen.add(id); entries.push(entry); }
      });
    });
    return entries;
  }, [allLogs]);

  // Sync a daily summary to the server so the client's coach can see it.
  useEffect(() => {
    if (!logsReady || !goalsReady || !suppsReady) return;
    const t = setTimeout(() => {
      setSyncStatus("saving");
      fetch("/api/client/nutrition", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: key, totals, goal: activeGoal, supplements: takenToday }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Sync failed");
          setSyncStatus("saved");
        })
        .catch(() => setSyncStatus("error"));
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, totals.cal, totals.p, totals.c, totals.f, activeGoal.calories, activeGoal.protein, activeGoal.carbs, activeGoal.fat, takenToday.length, logsReady, goalsReady, suppsReady]);

  function mealTotals(meal: Meal) {
    return day[meal].reduce((s, e) => s + e.cal, 0);
  }
  function shiftDay(n: number) {
    const d = new Date(date); d.setDate(d.getDate() + n); setDate(d); setAddTo(null);
  }

  function copyYesterday() {
    const previous = new Date(date);
    previous.setDate(previous.getDate() - 1);
    const previousDay = allLogs[dateKey(previous)];
    if (!previousDay || !(Object.values(previousDay) as Entry[][]).some((items) => items.length)) return;
    const next = { ...allLogs, [key]: { ...emptyDay(), ...(allLogs[key] || {}) } };
    (Object.keys(next[key]) as Meal[]).forEach((meal) => {
      next[key][meal] = [...next[key][meal], ...(previousDay[meal] || []).map((entry) => ({ ...entry, id: uid() }))];
    });
    persist(next);
  }

  function latestMeal(meal: Meal) {
    const dateKeys = Object.keys(allLogs).filter((dayKey) => dayKey < key).sort((a, b) => b.localeCompare(a));
    for (const dayKey of dateKeys) {
      const items = allLogs[dayKey]?.[meal] || [];
      if (items.length) return items;
    }
    return null;
  }

  function repeatLatestMeal(meal: Meal) {
    const items = latestMeal(meal);
    if (!items) return;
    applyMeal(meal, { items });
  }

  const inputCls = "w-full bg-ink/40 border border-bone/20 px-2 py-1.5 text-bone text-sm focus:border-electric outline-none";
  const isToday = dateKey(new Date()) === key;
  const canCopyYesterday = !!allLogs[dateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1))];

  function Bar({ value, max, label, unit: u }: { value: number; max: number; label: string; unit: string }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const over = value > max && max > 0;
    return (
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-bone/50">{label}</span>
          <span className={"font-display text-sm " + (over ? "text-red-400" : "text-bone/80")}>
            {round(value)}<span className="text-bone/40">/{max}{u}</span>
          </span>
        </div>
        <div className="h-2 bg-ink/60 border border-bone/10 overflow-hidden">
          <div className={"h-full " + (over ? "bg-red-400" : "bg-electric")} style={{ width: pct + "%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {/* Diet selector */}
      <div className="border border-bone/15 bg-ink/20 p-5">
        <p className="font-display uppercase tracking-wider text-bone/60 text-xs mb-3">Your diet — filters the food list</p>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <button
              key={d}
              onClick={() => changeDiet(d)}
              className={"px-4 py-2 font-display uppercase tracking-wider text-xs transition-colors " +
                (diet === d ? "bg-electric text-ink" : "text-bone/60 border border-bone/20 hover:border-electric hover:text-electric")}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Date + goals */}
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <div className="border border-bone/15 bg-ink/20 p-5">
          <div className="flex items-center justify-between">
            <button onClick={() => shiftDay(-1)} className="font-display text-electric hover:text-bone px-2">←</button>
            <div className="text-center">
              <p className="font-display uppercase tracking-wider text-bone">{isToday ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" })}</p>
              <p className="text-xs text-bone/50">{date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <button onClick={() => shiftDay(1)} disabled={isToday} className="font-display text-electric hover:text-bone px-2 disabled:opacity-25">→</button>
          </div>
          <div className="mt-5 text-center">
            <p className="font-display text-4xl text-electric font-700">{round(totals.cal)}</p>
            <p className="text-[10px] uppercase tracking-wider text-bone/50 mt-1">of {activeGoal.calories} kcal · {Math.max(0, Math.round(activeGoal.calories - totals.cal))} left</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider">
              {canCopyYesterday && <button onClick={copyYesterday} className="text-electric hover:text-bone">Copy yesterday</button>}
              <span className={syncStatus === "error" ? "text-red-400" : syncStatus === "saved" ? "text-electric" : "text-bone/40"}>
                {syncStatus === "saving" ? "Saving…" : syncStatus === "saved" ? "Saved ✓" : syncStatus === "error" ? "Couldn’t sync — changes stay on this device" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="border border-bone/15 bg-ink/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display uppercase tracking-wider text-bone/60 text-xs">Daily Goals{cycleActive ? " · Cycle target" : ""}</p>
            <button onClick={() => { setGoalDraft(goal); setEditingGoal((v) => !v); }} className="font-display uppercase tracking-wider text-xs text-electric hover:text-bone">
              {editingGoal ? "Cancel" : "Edit goals"}
            </button>
          </div>
          {coachGoalNote && (
            <p className="mb-3 text-[11px] uppercase tracking-wider text-electric border border-electric/40 bg-electric/5 px-3 py-2">
              ★ {coachGoalNote} You can still edit them.
            </p>
          )}
          {cycleActive && <p className="mb-3 text-xs text-bone/55">Macro cycling is active for {cycleDay}. These targets override your base targets for this day.</p>}
          {editingGoal ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["calories", "protein", "carbs", "fat"] as (keyof Goal)[]).map((k) => (
                <label key={k} className="block">
                  <span className="text-[10px] uppercase tracking-wider text-bone/50">{k}</span>
                  <input type="number" value={goalDraft[k]} onChange={(e) => setGoalDraft({ ...goalDraft, [k]: parseFloat(e.target.value) || 0 })} className={inputCls + " mt-1"} />
                </label>
              ))}
              <button onClick={saveGoal} className="col-span-2 sm:col-span-4 bg-electric text-ink py-2 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">Save Goals</button>
            </div>
          ) : (
            <div className="grid gap-3">
              <Bar value={totals.cal} max={activeGoal.calories} label="Calories" unit="" />
              <Bar value={totals.p} max={activeGoal.protein} label="Protein" unit="g" />
              <Bar value={totals.c} max={activeGoal.carbs} label="Carbs" unit="g" />
              <Bar value={totals.f} max={activeGoal.fat} label="Fat" unit="g" />
            </div>
          )}
        </div>
      </div>

      {/* Weekly summary */}
      {weekly && (
        <div className="border border-bone/15 bg-ink/20 p-5">
          <p className="font-display uppercase tracking-wider text-bone/60 text-xs mb-3">
            This week — daily averages ({weekly.days} {weekly.days === 1 ? "day" : "days"} logged)
          </p>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[["Calories", weekly.cal], ["Protein", weekly.p + "g"], ["Carbs", weekly.c + "g"], ["Fat", weekly.f + "g"]].map(([l, v]) => (
              <div key={l as string} className="border border-bone/10 bg-ink/30 p-3">
                <p className="font-display text-2xl text-electric font-700">{v}</p>
                <p className="text-[10px] uppercase tracking-wider text-bone/50 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meals */}
      <div className="grid gap-4">
        {MEALS.map((meal) => (
          <div key={meal.id} className="border border-bone/15 bg-ink/20">
            <div className="flex items-center justify-between px-5 py-3 border-b border-bone/10">
              <p className="font-display uppercase tracking-wider text-bone">{meal.label}</p>
              <div className="flex items-center gap-4">
                <span className="text-sm text-electric font-display">{round(mealTotals(meal.id))} kcal</span>
                {latestMeal(meal.id) && (
                  <button onClick={() => repeatLatestMeal(meal.id)} className="font-display uppercase tracking-wider text-[10px] text-bone/55 hover:text-electric">
                    Repeat last
                  </button>
                )}
                <button onClick={() => setAddTo(addTo === meal.id ? null : meal.id)} className="font-display uppercase tracking-wider text-xs border border-electric text-electric px-3 py-1.5 hover:bg-electric hover:text-ink transition-colors">
                  {addTo === meal.id ? "Close" : "+ Add Food"}
                </button>
              </div>
            </div>

            {day[meal.id].length > 0 && (
              <ul className="divide-y divide-bone/5">
                {day[meal.id].map((e) => (
                  <li key={e.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    {editingEntry?.id === e.id && editingEntry.meal === meal.id ? (
                      <div className="w-full grid gap-2">
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                          <input value={editingEntry.draft.name} onChange={(event) => setEditingEntry({ ...editingEntry, draft: { ...editingEntry.draft, name: event.target.value } })} aria-label="Food name" className={inputCls + " col-span-2"} />
                          <input value={editingEntry.draft.cal} onChange={(event) => setEditingEntry({ ...editingEntry, draft: { ...editingEntry.draft, cal: Number(event.target.value) || 0 } })} inputMode="decimal" aria-label="Calories" className={inputCls} />
                          <input value={editingEntry.draft.p} onChange={(event) => setEditingEntry({ ...editingEntry, draft: { ...editingEntry.draft, p: Number(event.target.value) || 0 } })} inputMode="decimal" aria-label="Protein" className={inputCls} />
                          <input value={editingEntry.draft.c} onChange={(event) => setEditingEntry({ ...editingEntry, draft: { ...editingEntry.draft, c: Number(event.target.value) || 0 } })} inputMode="decimal" aria-label="Carbs" className={inputCls} />
                          <input value={editingEntry.draft.f} onChange={(event) => setEditingEntry({ ...editingEntry, draft: { ...editingEntry.draft, f: Number(event.target.value) || 0 } })} inputMode="decimal" aria-label="Fat" className={inputCls} />
                        </div>
                        <input value={editingEntry.draft.label} onChange={(event) => setEditingEntry({ ...editingEntry, draft: { ...editingEntry.draft, label: event.target.value } })} placeholder="Serving / amount" className={inputCls} />
                        <div className="flex gap-3">
                          <button onClick={() => updateEntry(meal.id, e.id, editingEntry.draft)} className="font-display uppercase tracking-wider text-xs text-electric hover:text-bone">Save</button>
                          <button onClick={() => setEditingEntry(null)} className="font-display uppercase tracking-wider text-xs text-bone/45 hover:text-bone">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <p className="text-sm text-bone/90 truncate">{e.name}{e.label ? ` · ${e.label}` : ""}</p>
                          <p className="text-[10px] uppercase tracking-wider text-bone/40 mt-0.5">{e.p}p · {e.c}c · {e.f}f</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-display text-sm text-bone/80">{e.cal}</span>
                          <button onClick={() => setEditingEntry({ meal: meal.id, id: e.id, draft: { ...e } })} className="font-display uppercase tracking-wider text-[10px] text-bone/50 hover:text-electric">Edit</button>
                          <button onClick={() => removeEntry(meal.id, e.id)} className="text-bone/40 hover:text-electric text-sm" aria-label={`Remove ${e.name}`}>✕</button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {addTo === meal.id && (
              <div className="px-5 py-4 border-t border-bone/10 bg-ink/30">
                {/* Amount + unit */}
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-[10px] uppercase tracking-wider text-bone/50">Amount</label>
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="any" className={inputCls + " w-24"} />
                  <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className="bg-ink/60 border border-bone/20 px-2 py-1.5 text-bone text-sm focus:border-electric outline-none">
                    <option value="g">grams</option>
                    <option value="oz">oz</option>
                    <option value="ml">ml</option>
                    <option value="l">liters</option>
                  </select>
                  <span className="text-[10px] uppercase tracking-wider text-bone/40">tap a food to log this amount</span>
                </div>

                {favoriteFoods.length > 0 && (
                  <div className="mb-3 border-b border-bone/10 pb-3">
                    <p className="text-[10px] uppercase tracking-wider text-electric mb-2">Favorites</p>
                    <div className="flex flex-wrap gap-2">
                      {favoriteFoods.map((food) => (
                        <button key={food.name} onClick={() => addFoodToMeal(meal.id, food)} className="text-xs border border-electric/40 text-electric px-2.5 py-1.5 hover:bg-electric hover:text-ink transition-colors">
                          ★ {food.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {recentFoods.length > 0 && (
                  <div className="mb-3 border-b border-bone/10 pb-3">
                    <p className="text-[10px] uppercase tracking-wider text-bone/50 mb-2">Recent foods — one-tap add</p>
                    <div className="flex flex-wrap gap-2">
                      {recentFoods.map((entry) => (
                        <button key={entry.id} onClick={() => addEntry(meal.id, { ...entry, id: uid() })} className="text-xs border border-bone/20 text-bone/70 px-2.5 py-1.5 hover:border-electric hover:text-electric transition-colors">
                          {entry.name} <span className="text-bone/40">· {entry.cal} cal</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saved meals */}
                <div className="mb-3 border-b border-bone/10 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-bone/50">Saved meals — one-tap add</span>
                    <button
                      type="button"
                      onClick={() => saveMeal(meal.id)}
                      disabled={day[meal.id].length === 0}
                      className="font-display uppercase tracking-wider text-[10px] border border-electric text-electric px-2.5 py-1 hover:bg-electric hover:text-ink transition-colors disabled:opacity-40"
                    >
                      Save this {meal.label} as a meal
                    </button>
                  </div>
                  {savedMeals.length === 0 ? (
                    <p className="text-[11px] text-bone/40">Build a meal below, then save it to reuse it any day.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {savedMeals.map((sm) => {
                        const cals = Math.round(sm.items.reduce((s, i) => s + i.cal, 0));
                        return (
                          <span key={sm.id} className="inline-flex items-center border border-bone/20 text-bone/70 text-xs">
                            <button onClick={() => applyMeal(meal.id, sm)} className="px-2.5 py-1.5 hover:text-electric transition-colors">
                              + {sm.name} <span className="text-bone/40">· {cals} cal</span>
                            </button>
                            <button onClick={() => deleteMeal(sm.id)} className="px-2 py-1.5 text-bone/40 hover:text-electric border-l border-bone/20">✕</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Coach meal templates */}
                {coachMeals.length > 0 && (
                  <div className="mb-3 border-b border-bone/10 pb-3">
                    <span className="text-[10px] uppercase tracking-wider text-electric">From your coach — one‑tap add</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {coachMeals.map((cm) => {
                        const cals = Math.round((cm.items || []).reduce((s, i) => s + i.cal, 0));
                        return (
                          <button key={cm.id} onClick={() => applyMeal(meal.id, cm)} className="text-xs border border-electric/40 text-electric px-2.5 py-1.5 hover:bg-electric hover:text-ink transition-colors">
                            + {cm.name} <span className="opacity-70">· {cals} cal</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search foods…" className={inputCls + " mb-2"} />
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {CUISINES.map((c) => (
                    <button key={c} onClick={() => setCuisine(c)} className={"px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors " + (cuisine === c ? "bg-electric text-ink" : "text-bone/60 border border-bone/20 hover:border-electric")}>{c}</button>
                  ))}
                </div>

                <div className="max-h-56 overflow-y-auto flex flex-wrap gap-2 mb-4">
                  {foodList.length === 0 ? (
                    <p className="text-bone/40 text-sm py-4">No foods match this diet / search.</p>
                  ) : (
                    foodList.map((f) => (
                      <span key={f.name} className="inline-flex border border-bone/20 text-xs text-bone/70">
                        <button onClick={() => addFoodToMeal(meal.id, f)} className="px-2.5 py-1.5 hover:text-electric transition-colors">
                          {f.name} <span className="text-bone/40">· {f.cal}{f.perItem ? " cal" : "/100g"}</span>
                        </button>
                        <button type="button" onClick={() => toggleFavorite(f.name)} aria-label={`${favorites.includes(f.name) ? "Remove" : "Add"} ${f.name} ${favorites.includes(f.name) ? "from" : "to"} favorites`} className={"border-l border-bone/15 px-2 hover:text-electric " + (favorites.includes(f.name) ? "text-electric" : "text-bone/40")}>
                          ★
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Custom food */}
                <div className="border-t border-bone/10 pt-3">
                  <p className="text-[10px] uppercase tracking-wider text-bone/50 mb-2">Custom food (totals for the amount above)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Name" className={inputCls + " col-span-2"} />
                    <input value={manual.cal} onChange={(e) => setManual({ ...manual, cal: e.target.value })} placeholder="Cal" type="number" className={inputCls} />
                    <input value={manual.p} onChange={(e) => setManual({ ...manual, p: e.target.value })} placeholder="P" type="number" className={inputCls} />
                    <input value={manual.c} onChange={(e) => setManual({ ...manual, c: e.target.value })} placeholder="C" type="number" className={inputCls} />
                    <input value={manual.f} onChange={(e) => setManual({ ...manual, f: e.target.value })} placeholder="F" type="number" className={inputCls} />
                  </div>
                  <button onClick={() => addManual(meal.id)} className="mt-2 bg-electric text-ink px-5 py-2 font-display uppercase tracking-wider text-sm hover:bg-bone transition-colors">Add custom</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] uppercase tracking-wider text-bone/40">
        Food macros are per 100g/ml and scale to your chosen amount. Your log syncs to your account. Set targets with the Macro Calculator.
      </p>

      {/* Supplements & vitamins */}
      <div className="border border-bone/15 bg-ink/20 p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display uppercase tracking-wider text-electric text-sm">
            Supplements &amp; Vitamins
          </p>
          <span className="text-[10px] uppercase tracking-wider text-bone/40">
            {takenToday.length} taken {isToday ? "today" : "this day"}
          </span>
        </div>
        <p className="text-bone/60 text-xs mb-4 leading-relaxed">
          Tap what you took to check it off for the selected day. Daily values are general guidance — follow your own plan.
        </p>
        <div className="flex flex-wrap gap-2">
          {[...COMMON_SUPPS, ...customSupps.map((n) => ({ name: n, info: "custom" }))].map((s) => {
            const on = takenToday.includes(s.name);
            return (
              <button
                key={s.name}
                onClick={() => toggleSupp(s.name)}
                title={s.info}
                className={
                  "px-3 py-2 text-xs font-display uppercase tracking-wider transition-colors border " +
                  (on
                    ? "bg-electric text-ink border-electric"
                    : "text-bone/70 border-bone/20 hover:border-electric hover:text-electric")
                }
              >
                {on ? "✓ " : ""}{s.name}
                <span className={"ml-1 " + (on ? "text-ink/60" : "text-bone/40")}>· {s.info}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-2 max-w-sm">
          <input
            value={newSupp}
            onChange={(e) => setNewSupp(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCustomSupp(); }}
            placeholder="Add a custom supplement…"
            className={inputCls}
          />
          <button
            onClick={addCustomSupp}
            className="shrink-0 bg-electric text-ink px-4 py-1.5 font-display uppercase tracking-wider text-xs hover:bg-bone transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
