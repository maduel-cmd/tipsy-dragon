# Product Requirements for Food Truck Bar Game
## Extracted from Gemini TrailLink Conversation

### UI/UX Requirements

#### Thumb-Zone Principle (Critical for mobile gameplay)
- **All primary action buttons must be in thumb-reachable zones** (bottom corners/center)
- **Minimum touch target size: 64x64 dp** (approximately 0.9 cm physical)
- Examples for bar game:
  - Drink mixing buttons
  - Customer service actions
  - Quick-access inventory
  - Payment/checkout buttons

#### Role-Based Co-Op Play
- **Define distinct player roles** with simple, clear responsibilities
  - Examples: Bartender, Server, Cashier, DJ/Entertainment
- **Each role should have different mechanics** to avoid monotony
- **Easy role switching** for single-player mode

#### Offline-First Architecture
- **Game must work fully offline** with graceful degradation
- **Sync conflicts handling** when coming back online
- **Queue actions** for later processing
- **Cache customer orders, recipes, inventory** locally

#### Micro-Tutorials (Onboarding as Gameplay)
- **NO long tutorial screens at start**
- **30-second contextual lessons** that appear during gameplay
- **Progressive disclosure** - teach mechanics as they become relevant
- Example: First customer teaches ordering, second teaches mixing, etc.

---

### Visual Design Requirements

#### High Contrast / Sunlight Mode
- **Support high contrast color schemes** for outdoor/bright light use
- **Avoid pure whites and low-contrast elements**
- **Test in actual sunlight conditions**
- **Outdoor/mobile-friendly color palette**

#### Stylized Visual Language
- **Cartographic/stylized art** (Low-poly, flat design, or neomorphic)
- **Should feel like a GAME not a simulation** from second one
- **Visual juice**: pulsing, glowing effects for important elements
  - Customers ready to order
  - Drinks ready to serve
  - Tips available to collect

#### Visual Feedback for Points of Interest (POI)
- **Highlight important elements** with glow/pulsing effects
- **Animate state changes** (customer mood, drink preparation stages)
- **Use color/animation to communicate urgency**

---

### Technology & Game Feel

#### Engine Choice
- **Unity or Flutter/React Native** with custom game overlay
- **Prioritize fast iteration** and cross-platform support
- **Native performance** for smooth animations at 60fps

#### Multiplayer/Social (Adapted from WebRTC/PTT)
- **Local co-op over WiFi Direct** or peer-to-peer mesh
- **Async challenges/leaderboards** (no real-time needed initially)
- **Social features**: Share recipes, compete on daily challenges

#### Proximity/Geofencing Concepts → Food Truck Locations
- **Unlock new recipes/customers** based on in-game "location" progression
- **Seasonal/event-based content** (adapt the proximity trigger concept)
- **"Travel" to different neighborhoods** with different customer types

#### Gestural "Sipario" Mechanic (Swipe/Gesture Controls)
- **Physical gestures for bartending actions**:
  - Shake phone to mix drinks
  - Swipe to pour
  - Tap to garnish
- **Make it feel like you're physically working the bar**

---

### Market Insights (Applied to Bar Game)

#### From Geocaching
- **Simple core loop**, deep community/collection mechanics
- **Clear goals and achievements**
- **Social/sharing features built-in**

#### From Zombies, Run / Audio Games
- **Narrative/story progression** through service
- **Immersive audio cues** for game state
- **Make routine actions feel exciting**

#### From Pokémon GO / Location Games
- **Collection mechanics** (recipes, ingredients, customers)
- **Daily challenges** to drive retention
- **Event-based limited content**

#### From Gaia GPS / Outdoor Apps
- **Offline-first is TABLE STAKES** for mobile games
- **Smooth operation in degraded network** conditions
- **Clear visual hierarchy** for usability

---

### Critical "Game from First Second" Requirements

1. **First interaction teaches core mechanic** (serve first drink in 10 seconds)
2. **Immediate positive feedback** (visual/audio celebration)
3. **No menus/config before gameplay**
4. **Tutorial IS gameplay**, not separate mode
5. **Juice/polish on every interaction** (particles, sound, animation)
6. **Clear goals visible at all times** (orders, tips, level progress)
7. **Fast iteration loops** (customer → order → serve → reward = 30-60s)

---

### Priority Implementation Order

**Phase 1: Core Game Feel (Week 1-2)**
- Thumb-zone UI layout
- Single drink type, single customer
- Gesture controls for mixing/serving
- Immediate visual/audio feedback
- 60fps smooth performance

**Phase 2: Offline & Content (Week 3-4)**
- Full offline mode with local storage
- 3-5 drink recipes
- 3-5 customer types
- Basic progression (unlock recipes)

**Phase 3: Role/Co-op (Week 5-6)**
- Multiple player roles
- Local co-op mode
- Role-specific tutorials

**Phase 4: Polish & Juice (Week 7-8)**
- Sunlight mode / high contrast theme
- Particle effects, animations
- Audio design pass
- Micro-tutorial refinement

---

### Anti-Patterns to Avoid

❌ Long tutorial before gameplay
❌ Small touch targets
❌ Requiring internet connection for core gameplay
❌ Complex menus/nested navigation
❌ Simulation-style visuals (make it feel like a GAME)
❌ Delayed feedback on user actions
❌ Hidden mechanics that aren't discoverable

---

### Success Metrics

- **Time to first drink served**: < 30 seconds from app launch
- **Tutorial completion rate**: > 90% (because it's integrated)
- **Offline playability**: 100% of core mechanics work offline
- **Touch target accessibility**: All primary actions in thumb zone
- **Frame rate**: Consistent 60fps on target devices
- **Session length**: 3-5 minute sessions (mobile-optimized)

