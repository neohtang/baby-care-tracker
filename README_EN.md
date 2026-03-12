# Baby Care Tracker

**A WeChat Mini Program for tracking daily care of newborns aged 0–12 months**

A WeChat Mini Program designed for new parents to systematically track all aspects of their baby's daily routine — feeding, sleep, diaper changes, health, and development — providing a comprehensive view of the baby's growth.

## Features

The app uses a five-tab bottom navigation layout: **Home → Daily Log → Health Monitor → Growth & Development → Profile**.

| Module | Description |
|--------|-------------|
| **Home** | Card-based daily overview (feeding/sleep/diaper stats), quick-access shortcuts (log feeding, sleep, diaper, temperature, growth, milestones), daily timeline |
| **Daily Log** | Feeding records (breastfeeding timer + side selection, formula volume, solid food ingredients & weight), sleep records (one-tap timer, daytime/nighttime classification), diaper records (color/texture selection, diarrhea alerts) |
| **Health Monitor** | Temperature records (axillary/forehead/ear, abnormal highlighting), vaccination tracking (national immunization schedule, records & due-date reminders), medication log |
| **Growth & Development** | Growth data (height/weight/head circumference, WHO-standard growth curve charts), developmental milestones (monthly tracking of gross motor/fine motor/language/social skills) |
| **Profile** | Baby info management, multi-baby switching, data import/export (JSON backup), settings |

## Tech Stack

- **Framework**: WeChat Mini Program (native) + TypeScript
- **UI Components**: [TDesign for WeChat Mini Program](https://tdesign.tencent.com/miniprogram/)
- **Date Handling**: dayjs
- **Charts**: echarts-for-weixin (growth curves)
- **Icons**: Custom SVG icon set (33 vector icons in a unified soft color palette)
- **Data Storage**: WeChat local storage (`wx.setStorageSync`)
- **Testing**: Jest + ts-jest
- **CI**: WeChat CI scripts (preview, upload, NPM build)

## Project Structure

```
baby-care-tracker/
├── miniprogram/
│   ├── app.ts                    # App entry point
│   ├── app.json                  # Global config (routes, tabBar, component refs)
│   ├── app.wxss                  # Global styles
│   ├── sitemap.json              # Mini Program sitemap config
│   ├── assets/
│   │   └── icons/                # SVG vector icons & tabBar PNG icons
│   │       ├── bottle.svg        #   Baby bottle
│   │       ├── breastfeed.svg    #   Breastfeeding
│   │       ├── sleep.svg         #   Sleep
│   │       ├── thermometer.svg   #   Thermometer
│   │       ├── baby.svg          #   Baby
│   │       ├── ...               #   33 SVGs + 16 PNGs in total
│   │       └── warning.svg       #   Warning
│   ├── components/               # Custom components
│   │   ├── baby-avatar/          #   Baby avatar
│   │   ├── daily-timeline/       #   Daily timeline
│   │   ├── growth-chart/         #   Growth curve chart
│   │   ├── record-card/          #   Record card (swipe actions)
│   │   ├── stat-summary/         #   Statistics summary
│   │   └── timer/                #   Timer
│   ├── data/                     # Static data
│   │   ├── milestones.ts         #   Developmental milestone definitions
│   │   ├── vaccines.ts           #   National immunization schedule
│   │   └── who-standards.ts      #   WHO growth standard references
│   ├── pages/                    # Pages
│   │   ├── home/                 #   Home (card overview + shortcuts)     [Tab]
│   │   ├── daily/                #   Daily log (feeding/sleep/diaper)     [Tab]
│   │   ├── health-center/        #   Health monitor (temp/vaccine/meds)   [Tab]
│   │   ├── growth-center/        #   Growth & dev (data + milestones)     [Tab]
│   │   ├── profile/              #   Profile (baby mgmt/data/settings)    [Tab]
│   │   ├── feeding/              #   Feeding record list
│   │   │   └── add/              #     Add feeding record
│   │   ├── sleep/                #   Sleep record list
│   │   │   └── add/              #     Add sleep record
│   │   ├── diaper/               #   Diaper record list
│   │   │   └── add/              #     Add diaper record
│   │   ├── health/               #   Health/temperature records
│   │   │   └── add/              #     Add health record
│   │   ├── growth/               #   Growth data (standalone entry)
│   │   ├── milestone/            #   Developmental milestones (standalone)
│   │   ├── vaccine/              #   Vaccination records
│   │   └── settings/             #   Settings
│   ├── services/                 # Business service layer
│   │   ├── storage.ts            #   Generic storage engine (CRUD)
│   │   ├── baby.ts               #   Baby info management
│   │   ├── feeding.ts            #   Feeding logic
│   │   ├── sleep.ts              #   Sleep logic
│   │   ├── diaper.ts             #   Diaper logic
│   │   ├── health.ts             #   Health/temperature logic
│   │   ├── growth.ts             #   Growth data logic
│   │   ├── milestone.ts          #   Milestone logic
│   │   ├── vaccine.ts            #   Vaccination logic
│   │   ├── statistics.ts         #   Home dashboard statistics
│   │   └── export.ts             #   Data import/export
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.d.ts            #   Unified export entry
│   │   ├── baby.d.ts             #   Baby info types
│   │   ├── feeding.d.ts          #   Feeding record types
│   │   ├── sleep.d.ts            #   Sleep record types
│   │   ├── diaper.d.ts           #   Diaper record types
│   │   ├── health.d.ts           #   Health record types
│   │   ├── growth.d.ts           #   Growth data types
│   │   ├── milestone.d.ts        #   Milestone types
│   │   └── vaccine.d.ts          #   Vaccination types
│   └── utils/                    # Utility functions
│       ├── date.ts               #   Date formatting & calculations
│       ├── event-bus.ts          #   Global event bus
│       ├── icons.ts              #   Icon path mappings
│       └── validator.ts          #   Form validation utilities
├── __tests__/                    # Unit tests
│   ├── setup.ts                  #   Test environment setup
│   ├── wx-types.d.ts             #   wx API mock types
│   ├── services/                 #   Service layer tests (10 files)
│   └── utils/                    #   Utility function tests
├── ci/                           # CI/CD scripts
│   ├── pack-npm.js               #   NPM build
│   ├── preview.js                #   Preview QR code generation
│   ├── upload.js                 #   Version upload
│   └── project.js                #   Project configuration
├── package.json
├── package-lock.json
├── tsconfig.json                 # Mini Program TS compiler config
├── tsconfig.test.json            # Jest TS config
├── jest.config.ts                # Jest test config
├── project.config.json           # WeChat DevTools project config
├── LICENSE
└── README.md
```

## Development Guide

### Prerequisites

1. Install [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. Install Node.js >= 16
3. Register a Mini Program account on the [WeChat Official Accounts Platform](https://mp.weixin.qq.com/) and obtain an AppID

### Installation & Running

```bash
# Clone the repository
git clone https://github.com/neohtang/baby-care-tracker.git
cd baby-care-tracker

# Install dependencies
npm install

# Open the project directory in WeChat DevTools
# In DevTools: Tools -> Build npm
```

### Running Tests

```bash
# Run all unit tests
npx jest

# With coverage report
npx jest --coverage
```

### Configuring AppID

Edit `project.config.json` and replace the `appid` field with your own Mini Program AppID:

```json
{
  "appid": "wxYOUR_APP_ID"
}
```

## Data Storage

All data is stored locally on the user's WeChat client and is never uploaded to any server, eliminating privacy risks. Users can export a JSON backup through the settings page and restore data from a backup file.

## Disclaimer

This Mini Program is intended solely as a daily care logging reference and does not constitute medical advice. For any health concerns, please consult a qualified healthcare professional.

## License

[MIT License](./LICENSE)
