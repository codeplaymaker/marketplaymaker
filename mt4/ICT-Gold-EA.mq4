//+------------------------------------------------------------------+
//|                                              ICT-Gold-EA.mq4     |
//|                                    MarketPlaymaker ICT Gold Bot   |
//|                         Auto-Adaptive ICT Strategy for XAUUSD    |
//+------------------------------------------------------------------+
#property copyright "MarketPlaymaker"
#property link      ""
#property version   "1.00"
#property strict

//+------------------------------------------------------------------+
//| ENUMS                                                            |
//+------------------------------------------------------------------+
enum ENUM_ENTRY_TYPE {
   ENTRY_FVG       = 0,  // Fair Value Gap
   ENTRY_OB        = 1,  // Order Block
   ENTRY_OTE       = 2,  // Optimal Trade Entry
   ENTRY_LIQSWEEP  = 3,  // Liquidity Sweep
   ENTRY_BREAKER   = 4,  // Breaker Block
   ENTRY_TYPES     = 5   // Total count
};

enum ENUM_SESSION {
   SESSION_LONDON    = 0,
   SESSION_NY_AM     = 1,
   SESSION_NY_PM     = 2,
   SESSION_SILVER_AM = 3,
   SESSION_SILVER_PM = 4,
   SESSION_MACRO     = 5,
   SESSION_TYPES     = 6
};

enum ENUM_SL_TYPE {
   SL_CANDLE_BODY   = 0, // Candle Body
   SL_FVG_INVALID   = 1, // FVG Invalidation
   SL_OB_INVALID    = 2, // OB Invalidation
   SL_SWING_POINT   = 3  // Swing Point
};

//+------------------------------------------------------------------+
//| INPUT PARAMETERS                                                 |
//+------------------------------------------------------------------+

//--- General
extern string  Gen_Settings      = "═══ General Settings ═══";
extern double  RiskPercent        = 1.0;     // Risk per trade %
extern int     MaxDailyTrades     = 3;       // Max trades per day
extern int     MinConfluence      = 2;       // Min confluence score (1-7)
extern int     MagicNumber        = 77701;   // EA magic number
extern double  MaxSpreadPoints    = 50;      // Max spread in points (5 = 0.5 pips on gold)
extern bool    TradeDirection     = true;    // true=Both, false=see LongOnly/ShortOnly
extern bool    LongOnly           = false;
extern bool    ShortOnly          = false;

//--- HTF Bias
extern string  HTF_Settings      = "═══ HTF Bias Filter ═══";
extern bool    UseHTFBias         = true;
extern ENUM_TIMEFRAMES HTF_Timeframe = PERIOD_H4;
extern int     HTF_SwingLen       = 5;

//--- Structure Detection
extern string  Struct_Settings   = "═══ Structure Detection ═══";
extern int     SwingLength        = 5;       // Pivot lookback
extern double  MSS_DisplacementATR = 0.5;    // Min displacement in ATR multiples
extern bool    RequireDisplacement = true;

//--- FVG
extern string  FVG_Settings     = "═══ Fair Value Gap ═══";
extern bool    UseFVG             = true;
extern double  FVG_MinSizeATR     = 0.2;     // Min FVG size in ATR
extern int     FVG_MaxAge         = 50;       // Max bars before FVG expires
extern int     FVG_EntryMethod    = 1;        // 0=Full fill, 1=CE(50%), 2=Edge

//--- Order Blocks
extern string  OB_Settings      = "═══ Order Blocks ═══";
extern bool    UseOB              = true;
extern int     OB_MaxTouches      = 2;
extern int     OB_MaxAge          = 200;

//--- OTE
extern string  OTE_Settings     = "═══ Optimal Trade Entry ═══";
extern bool    UseOTE             = true;
extern double  OTE_FibLow         = 0.62;
extern double  OTE_FibHigh        = 0.79;
extern double  OTE_FibSweet       = 0.705;

//--- Liquidity
extern string  Liq_Settings     = "═══ Liquidity Sweep ═══";
extern bool    UseLiqSweep        = true;
extern int     Liq_Lookback       = 20;

//--- Stop Loss
extern string  SL_Settings      = "═══ Stop Loss ═══";
extern ENUM_SL_TYPE SLType        = SL_FVG_INVALID;
extern double  SL_BufferATR       = 0.5;
extern bool    MoveSLtoBE         = true;     // Move SL to breakeven after TP1

//--- Take Profit
extern string  TP_Settings      = "═══ Take Profit ═══";
extern double  TP1_RR             = 2.0;
extern double  TP1_ClosePct       = 25.0;
extern double  TP2_RR             = 4.0;
extern double  TP2_ClosePct       = 50.0;
extern bool    UseTrailingStop     = true;
extern double  TrailATR           = 2.0;

//--- Killzones (EST times)
extern string  KZ_Settings      = "═══ Killzones (EST) ═══";
extern bool    OnlyKillzones      = true;
extern bool    KZ_London          = true;     // 02:00-05:00
extern bool    KZ_NY_AM           = true;     // 08:30-11:00
extern bool    KZ_NY_PM           = false;    // 13:30-16:00
extern bool    KZ_SilverAM        = true;     // 10:00-11:00
extern bool    KZ_SilverPM        = false;    // 14:00-15:00
extern bool    KZ_Macro           = true;     // ICT macro windows
extern bool    AvoidMonday        = true;
extern bool    AvoidFriday        = false;
extern bool    AvoidNYLunch       = true;     // 12:00-13:30
extern bool    CloseBeforeLunch   = true;
extern int     BrokerGMTOffset    = 2;        // IC Markets is typically GMT+2 or +3

//--- ADR Volatility Filter
extern string  ADR_Settings     = "═══ ADR Filter ═══";
extern bool    UseADRFilter       = true;
extern int     ADR_Lookback       = 20;
extern double  ADR_MaxUsedPct     = 80.0;

//--- Adaptive Learning
extern string  Adapt_Settings   = "═══ Adaptive Learning ═══";
extern bool    UseAdaptive        = true;
extern int     Adapt_WindowSize   = 50;       // Rolling window for stats
extern double  Adapt_MinWinRate   = 0.30;     // Disable entry type below this
extern int     Adapt_ConsecLossCut = 3;       // Reduce size after N consecutive losses
extern double  Adapt_LossReduction = 0.5;     // Lot reduction factor after streak

//+------------------------------------------------------------------+
//| GLOBAL VARIABLES                                                 |
//+------------------------------------------------------------------+

//--- Structure tracking
double g_lastSwingHigh, g_lastSwingLow;
double g_prevSwingHigh, g_prevSwingLow;
int    g_lastSwingHighBar, g_lastSwingLowBar;
int    g_structureBias;  // 1=bull, -1=bear, 0=neutral
double g_mssLevel;

//--- HTF bias
int    g_htfBias;  // 1=bull, -1=bear, 0=neutral

//--- FVG tracking (parallel arrays, max 30)
#define MAX_FVGS 30
double g_fvgTop[MAX_FVGS], g_fvgBot[MAX_FVGS];
int    g_fvgBar[MAX_FVGS], g_fvgDir[MAX_FVGS];
bool   g_fvgActive[MAX_FVGS];
int    g_fvgCount;

//--- OB tracking (parallel arrays, max 20)
#define MAX_OBS 20
double g_obTop[MAX_OBS], g_obBot[MAX_OBS];
int    g_obBar[MAX_OBS], g_obDir[MAX_OBS], g_obTouches[MAX_OBS];
bool   g_obActive[MAX_OBS];
int    g_obCount;

//--- OTE tracking
double g_oteSwingHigh, g_oteSwingLow;
bool   g_oteActive;
int    g_oteDirection;

//--- Daily tracking
int    g_dailyTrades;
int    g_lastTradeDay;
int    g_consecLosses;

//--- Adaptive learning stats
double g_entryWinRate[ENTRY_TYPES];
double g_entryWeight[ENTRY_TYPES];
int    g_entryWins[ENTRY_TYPES];
int    g_entryTotal[ENTRY_TYPES];
double g_sessionWinRate[SESSION_TYPES];
int    g_sessionWins[SESSION_TYPES];
int    g_sessionTotal[SESSION_TYPES];
bool   g_sessionEnabled[SESSION_TYPES];

//--- Trade management
int    g_openTicket;
double g_openSL, g_openTP1, g_openTP2;
double g_openEntry;
int    g_openType;   // OP_BUY or OP_SELL
int    g_openEntryModel;  // ENUM_ENTRY_TYPE
int    g_openSession;     // ENUM_SESSION
bool   g_tp1Hit;
double g_openLots;

//--- Logging
string g_logFile;
int    g_logHandle;

//+------------------------------------------------------------------+
//| INITIALIZATION                                                    |
//+------------------------------------------------------------------+
int OnInit() {
   //--- Validate symbol
   if(StringFind(Symbol(), "XAU") < 0 && StringFind(Symbol(), "GOLD") < 0) {
      Alert("ICT Gold EA: Attach to XAUUSD/GOLD chart only!");
      return INIT_FAILED;
   }
   
   //--- Init arrays
   g_fvgCount = 0;
   g_obCount  = 0;
   g_structureBias = 0;
   g_htfBias = 0;
   g_oteActive = false;
   g_openTicket = -1;
   g_tp1Hit = false;
   g_dailyTrades = 0;
   g_lastTradeDay = -1;
   g_consecLosses = 0;
   
   ArrayInitialize(g_fvgActive, false);
   ArrayInitialize(g_obActive, false);
   
   //--- Init adaptive weights (all equal at start)
   for(int i = 0; i < ENTRY_TYPES; i++) {
      g_entryWeight[i] = 1.0;
      g_entryWinRate[i] = 0.5;
      g_entryWins[i] = 0;
      g_entryTotal[i] = 0;
   }
   for(int i = 0; i < SESSION_TYPES; i++) {
      g_sessionWinRate[i] = 0.5;
      g_sessionWins[i] = 0;
      g_sessionTotal[i] = 0;
      g_sessionEnabled[i] = true;
   }
   
   //--- Load adaptive state from file
   g_logFile = "ICT_Gold_EA_" + IntegerToString(MagicNumber);
   LoadAdaptiveState();
   
   Print("ICT Gold EA v1.0 initialized | Magic: ", MagicNumber, 
         " | Risk: ", RiskPercent, "% | MinConf: ", MinConfluence);
   
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   SaveAdaptiveState();
   Print("ICT Gold EA deinitialized. Adaptive state saved.");
}

//+------------------------------------------------------------------+
//| MAIN TICK FUNCTION                                                |
//+------------------------------------------------------------------+
void OnTick() {
   //--- Only run on new bar (except for trade management which runs every tick)
   ManageOpenTrade();
   
   static datetime lastBar = 0;
   if(Time[0] == lastBar) return;
   lastBar = Time[0];
   
   //--- Reset daily counter
   int today = TimeDay(TimeCurrent());
   if(today != g_lastTradeDay) {
      g_dailyTrades = 0;
      g_lastTradeDay = today;
   }
   
   //--- Core analysis (run every new bar)
   double atr14 = iATR(NULL, 0, 14, 0);
   if(atr14 < Point) return;  // safety
   
   UpdateMarketStructure(atr14);
   UpdateHTFBias();
   UpdateFVGs(atr14);
   UpdateOrderBlocks(atr14);
   UpdateOTE();
   
   //--- Check if we should trade
   if(g_dailyTrades >= MaxDailyTrades) return;
   if(g_openTicket > 0 && OrderSelect(g_openTicket, SELECT_BY_TICKET)) {
      if(OrderCloseTime() == 0) return;  // already have open position
   }
   
   //--- Spread check
   double spread = MarketInfo(Symbol(), MODE_SPREAD);
   if(spread > MaxSpreadPoints) return;
   
   //--- Session checks  
   if(!IsSessionAllowed()) return;
   
   //--- ADR check
   if(UseADRFilter && !IsADROK()) return;
   
   //--- Close before lunch
   if(CloseBeforeLunch && IsNYLunch()) {
      CloseAllPositions("Lunch close");
      return;
   }
   
   //--- Look for entries
   CheckForEntry(atr14);
}

//+------------------------------------------------------------------+
//| MARKET STRUCTURE                                                  |
//+------------------------------------------------------------------+
void UpdateMarketStructure(double atr14) {
   //--- Find swing highs/lows using pivots
   double swHigh = FindSwingHigh(SwingLength);
   double swLow  = FindSwingLow(SwingLength);
   
   if(swHigh > 0 && swHigh != g_lastSwingHigh) {
      g_prevSwingHigh = g_lastSwingHigh;
      g_lastSwingHigh = swHigh;
      g_lastSwingHighBar = iBarShift(NULL, 0, Time[SwingLength]);
   }
   
   if(swLow > 0 && swLow != g_lastSwingLow) {
      g_prevSwingLow = g_lastSwingLow;
      g_lastSwingLow = swLow;
      g_lastSwingLowBar = iBarShift(NULL, 0, Time[SwingLength]);
   }
   
   //--- Detect Market Structure Shift (MSS)
   double bodySize = MathAbs(Close[0] - Open[0]);
   bool isDisplacement = bodySize > atr14 * MSS_DisplacementATR;
   
   // Bullish MSS: close above last swing high (structure shift from bearish)
   bool bullMSS = Close[0] > g_lastSwingHigh && g_lastSwingHigh > 0 
                  && (!RequireDisplacement || isDisplacement) 
                  && g_structureBias <= 0;
   
   // Bearish MSS: close below last swing low
   bool bearMSS = Close[0] < g_lastSwingLow && g_lastSwingLow > 0 
                  && (!RequireDisplacement || isDisplacement) 
                  && g_structureBias >= 0;
   
   if(bullMSS) {
      g_structureBias = 1;
      g_mssLevel = g_lastSwingHigh;
      
      // Setup OTE
      g_oteSwingLow = g_lastSwingLow;
      g_oteSwingHigh = High[0];
      g_oteActive = true;
      g_oteDirection = 1;
   }
   
   if(bearMSS) {
      g_structureBias = -1;
      g_mssLevel = g_lastSwingLow;
      
      g_oteSwingHigh = g_lastSwingHigh;
      g_oteSwingLow = Low[0];
      g_oteActive = true;
      g_oteDirection = -1;
   }
}

double FindSwingHigh(int len) {
   // Check if bar[len] is the highest high in window [0..len*2]
   if(Bars < len * 2 + 1) return 0;
   double pivot = High[len];
   for(int i = 0; i <= len * 2; i++) {
      if(i == len) continue;
      if(High[i] >= pivot) return 0;
   }
   return pivot;
}

double FindSwingLow(int len) {
   if(Bars < len * 2 + 1) return 0;
   double pivot = Low[len];
   for(int i = 0; i <= len * 2; i++) {
      if(i == len) continue;
      if(Low[i] <= pivot) return 0;
   }
   return pivot;
}

//+------------------------------------------------------------------+
//| HTF BIAS                                                          |
//+------------------------------------------------------------------+
void UpdateHTFBias() {
   if(!UseHTFBias) { g_htfBias = 0; return; }
   
   double htfHigh = 0, htfLow = 0;
   
   // Find last swing high/low on HTF
   for(int i = HTF_SwingLen; i < 100; i++) {
      double h = iHigh(NULL, HTF_Timeframe, i);
      bool isPivotHigh = true;
      for(int j = i - HTF_SwingLen; j <= i + HTF_SwingLen; j++) {
         if(j == i || j < 0) continue;
         if(iHigh(NULL, HTF_Timeframe, j) >= h) { isPivotHigh = false; break; }
      }
      if(isPivotHigh && htfHigh == 0) { htfHigh = h; }
      
      double l = iLow(NULL, HTF_Timeframe, i);
      bool isPivotLow = true;
      for(int j = i - HTF_SwingLen; j <= i + HTF_SwingLen; j++) {
         if(j == i || j < 0) continue;
         if(iLow(NULL, HTF_Timeframe, j) <= l) { isPivotLow = false; break; }
      }
      if(isPivotLow && htfLow == 0) { htfLow = l; }
      
      if(htfHigh > 0 && htfLow > 0) break;
   }
   
   double htfClose = iClose(NULL, HTF_Timeframe, 0);
   if(htfClose > htfHigh && htfHigh > 0)      g_htfBias = 1;
   else if(htfClose < htfLow && htfLow > 0)   g_htfBias = -1;
   // else keep previous bias
}

//+------------------------------------------------------------------+
//| FAIR VALUE GAPS                                                   |
//+------------------------------------------------------------------+
void UpdateFVGs(double atr14) {
   if(!UseFVG) return;
   
   //--- Detect new FVGs
   // Bullish FVG: Low[0] > High[2] — gap between candle 1 and candle 3
   bool bullFVG = Low[0] > High[2] && (Low[0] - High[2]) > atr14 * FVG_MinSizeATR;
   bool bearFVG = High[0] < Low[2] && (Low[2] - High[0]) > atr14 * FVG_MinSizeATR;
   
   if(bullFVG) AddFVG(Low[0], High[2], Bars - 0, 1);
   if(bearFVG) AddFVG(Low[2], High[0], Bars - 0, -1);
   
   //--- Manage existing FVGs
   for(int i = 0; i < g_fvgCount; i++) {
      if(!g_fvgActive[i]) continue;
      
      // Expire old FVGs
      int age = (Bars - 0) - g_fvgBar[i];
      if(age > FVG_MaxAge) { g_fvgActive[i] = false; continue; }
      
      // Check if filled
      if(g_fvgDir[i] == 1 && Low[0] <= g_fvgBot[i])
         g_fvgActive[i] = false;
      if(g_fvgDir[i] == -1 && High[0] >= g_fvgTop[i])
         g_fvgActive[i] = false;
   }
}

void AddFVG(double top, double bot, int bar, int dir) {
   if(g_fvgCount < MAX_FVGS) {
      g_fvgTop[g_fvgCount] = top;
      g_fvgBot[g_fvgCount] = bot;
      g_fvgBar[g_fvgCount] = bar;
      g_fvgDir[g_fvgCount] = dir;
      g_fvgActive[g_fvgCount] = true;
      g_fvgCount++;
   } else {
      // Shift array, remove oldest
      for(int i = 0; i < MAX_FVGS - 1; i++) {
         g_fvgTop[i] = g_fvgTop[i+1];
         g_fvgBot[i] = g_fvgBot[i+1];
         g_fvgBar[i] = g_fvgBar[i+1];
         g_fvgDir[i] = g_fvgDir[i+1];
         g_fvgActive[i] = g_fvgActive[i+1];
      }
      g_fvgTop[MAX_FVGS-1] = top;
      g_fvgBot[MAX_FVGS-1] = bot;
      g_fvgBar[MAX_FVGS-1] = bar;
      g_fvgDir[MAX_FVGS-1] = dir;
      g_fvgActive[MAX_FVGS-1] = true;
   }
}

//--- Find nearest active FVG
bool FindNearestFVG(int dir, double &fvgTop, double &fvgBot) {
   double bestDist = 1e10;
   bool found = false;
   for(int i = 0; i < g_fvgCount; i++) {
      if(!g_fvgActive[i] || g_fvgDir[i] != dir) continue;
      double ce = (g_fvgTop[i] + g_fvgBot[i]) / 2.0;
      double dist = MathAbs(Close[0] - ce);
      if(dist < bestDist) {
         bestDist = dist;
         fvgTop = g_fvgTop[i];
         fvgBot = g_fvgBot[i];
         found = true;
      }
   }
   return found;
}

double GetFVGEntry(double top, double bot, int dir) {
   if(FVG_EntryMethod == 0) return (dir == 1) ? bot : top;          // Full fill
   if(FVG_EntryMethod == 1) return (top + bot) / 2.0;               // CE 50%
   return (dir == 1) ? top : bot;                                    // Edge
}

//+------------------------------------------------------------------+
//| ORDER BLOCKS                                                      |
//+------------------------------------------------------------------+
void UpdateOrderBlocks(double atr14) {
   if(!UseOB) return;
   
   double bodySize = MathAbs(Close[0] - Open[0]);
   
   // Bullish OB: bullish displacement after bearish candle
   bool bullDisp = Close[0] > Open[0] && bodySize > atr14 * MSS_DisplacementATR && Close[1] < Open[1];
   // Bearish OB: bearish displacement after bullish candle
   bool bearDisp = Close[0] < Open[0] && bodySize > atr14 * MSS_DisplacementATR && Close[1] > Open[1];
   
   if(bullDisp) AddOB(MathMax(Open[1], Close[1]), MathMin(Open[1], Close[1]), Bars - 1, 1);
   if(bearDisp) AddOB(MathMax(Open[1], Close[1]), MathMin(Open[1], Close[1]), Bars - 1, -1);
   
   //--- Manage OBs
   for(int i = 0; i < g_obCount; i++) {
      if(!g_obActive[i]) continue;
      
      int age = (Bars - 0) - g_obBar[i];
      if(age > OB_MaxAge) { g_obActive[i] = false; continue; }
      
      // Check touches
      bool inZone = Low[0] <= g_obTop[i] && High[0] >= g_obBot[i];
      if(inZone) g_obTouches[i]++;
      if(g_obTouches[i] >= OB_MaxTouches) g_obActive[i] = false;
      
      // Invalidation: price closes through OB
      if(g_obDir[i] == 1 && Close[0] < g_obBot[i]) g_obActive[i] = false;
      if(g_obDir[i] == -1 && Close[0] > g_obTop[i]) g_obActive[i] = false;
   }
}

void AddOB(double top, double bot, int bar, int dir) {
   if(g_obCount < MAX_OBS) {
      g_obTop[g_obCount] = top;
      g_obBot[g_obCount] = bot;
      g_obBar[g_obCount] = bar;
      g_obDir[g_obCount] = dir;
      g_obTouches[g_obCount] = 0;
      g_obActive[g_obCount] = true;
      g_obCount++;
   } else {
      for(int i = 0; i < MAX_OBS - 1; i++) {
         g_obTop[i] = g_obTop[i+1];
         g_obBot[i] = g_obBot[i+1];
         g_obBar[i] = g_obBar[i+1];
         g_obDir[i] = g_obDir[i+1];
         g_obTouches[i] = g_obTouches[i+1];
         g_obActive[i] = g_obActive[i+1];
      }
      g_obTop[MAX_OBS-1] = top;
      g_obBot[MAX_OBS-1] = bot;
      g_obBar[MAX_OBS-1] = bar;
      g_obDir[MAX_OBS-1] = dir;
      g_obTouches[MAX_OBS-1] = 0;
      g_obActive[MAX_OBS-1] = true;
   }
}

bool FindNearestOB(int dir, double &obTop, double &obBot) {
   double bestDist = 1e10;
   bool found = false;
   for(int i = 0; i < g_obCount; i++) {
      if(!g_obActive[i] || g_obDir[i] != dir) continue;
      double mid = (g_obTop[i] + g_obBot[i]) / 2.0;
      double dist = MathAbs(Close[0] - mid);
      if(dist < bestDist) {
         bestDist = dist;
         obTop = g_obTop[i];
         obBot = g_obBot[i];
         found = true;
      }
   }
   return found;
}

//+------------------------------------------------------------------+
//| OTE (Optimal Trade Entry)                                         |
//+------------------------------------------------------------------+
void UpdateOTE() {
   if(!UseOTE || !g_oteActive) return;
   
   // Invalidate if price breaks the swing
   if(g_oteDirection == 1 && Close[0] < g_oteSwingLow)
      g_oteActive = false;
   if(g_oteDirection == -1 && Close[0] > g_oteSwingHigh)
      g_oteActive = false;
}

bool IsInOTEZone() {
   if(!g_oteActive) return false;
   double range = g_oteSwingHigh - g_oteSwingLow;
   double oteLow, oteHigh;
   
   if(g_oteDirection == 1) {
      oteHigh = g_oteSwingHigh - range * OTE_FibLow;  // 62% retrace
      oteLow  = g_oteSwingHigh - range * OTE_FibHigh;  // 79% retrace
   } else {
      oteLow  = g_oteSwingLow + range * OTE_FibLow;
      oteHigh = g_oteSwingLow + range * OTE_FibHigh;
   }
   
   return Low[0] <= MathMax(oteLow, oteHigh) && High[0] >= MathMin(oteLow, oteHigh);
}

//+------------------------------------------------------------------+
//| LIQUIDITY SWEEP                                                   |
//+------------------------------------------------------------------+
bool IsBullishLiqSweep() {
   if(!UseLiqSweep) return false;
   
   // Get PDL (previous day low)
   double pdl = iLow(NULL, PERIOD_D1, 1);
   
   // Price swept below PDL or last swing low, then closed bullish above it
   return (Low[0] < pdl || Low[0] < g_lastSwingLow) 
          && Close[0] > Open[0] 
          && Close[0] > pdl;
}

bool IsBearishLiqSweep() {
   if(!UseLiqSweep) return false;
   
   double pdh = iHigh(NULL, PERIOD_D1, 1);
   
   return (High[0] > pdh || High[0] > g_lastSwingHigh) 
          && Close[0] < Open[0] 
          && Close[0] < pdh;
}

//+------------------------------------------------------------------+
//| SESSION / KILLZONE FILTERS                                        |
//+------------------------------------------------------------------+
int GetESTHour() {
   // Convert broker time to EST
   int gmtOffset = BrokerGMTOffset;  // IC Markets = GMT+2 typically
   int estOffset = -5;               // EST = GMT-5
   datetime brokerTime = TimeCurrent();
   int brokerHour = TimeHour(brokerTime);
   int brokerMinute = TimeMinute(brokerTime);
   int estHour = brokerHour - gmtOffset + estOffset;
   if(estHour < 0) estHour += 24;
   if(estHour >= 24) estHour -= 24;
   return estHour;
}

int GetESTMinute() {
   return TimeMinute(TimeCurrent());
}

bool InTimeWindow(int startH, int startM, int endH, int endM) {
   int h = GetESTHour();
   int m = GetESTMinute();
   int totalMin = h * 60 + m;
   int startMin = startH * 60 + startM;
   int endMin   = endH * 60 + endM;
   return totalMin >= startMin && totalMin < endMin;
}

bool IsLondonKZ()  { return InTimeWindow(2, 0, 5, 0); }
bool IsNYAMKZ()    { return InTimeWindow(8, 30, 11, 0); }
bool IsNYPMKZ()    { return InTimeWindow(13, 30, 16, 0); }
bool IsSilverAM()  { return InTimeWindow(10, 0, 11, 0); }
bool IsSilverPM()  { return InTimeWindow(14, 0, 15, 0); }
bool IsNYLunch()   { return InTimeWindow(12, 0, 13, 30); }
bool IsMacro()     { return InTimeWindow(9,50,10,10) || InTimeWindow(10,50,11,10) || InTimeWindow(13,50,14,10); }

int GetCurrentSession() {
   if(IsSilverAM())  return SESSION_SILVER_AM;
   if(IsSilverPM())  return SESSION_SILVER_PM;
   if(IsMacro())     return SESSION_MACRO;
   if(IsLondonKZ())  return SESSION_LONDON;
   if(IsNYAMKZ())    return SESSION_NY_AM;
   if(IsNYPMKZ())    return SESSION_NY_PM;
   return -1;
}

bool IsSessionAllowed() {
   int dow = TimeDayOfWeek(TimeCurrent());
   if(AvoidMonday && dow == 1) return false;
   if(AvoidFriday && dow == 5) return false;
   if(AvoidNYLunch && IsNYLunch()) return false;
   
   if(!OnlyKillzones) return true;
   
   bool inKZ = false;
   if(KZ_London && IsLondonKZ()) inKZ = true;
   if(KZ_NY_AM && IsNYAMKZ())   inKZ = true;
   if(KZ_NY_PM && IsNYPMKZ())   inKZ = true;
   if(KZ_SilverAM && IsSilverAM()) inKZ = true;
   if(KZ_SilverPM && IsSilverPM()) inKZ = true;
   if(KZ_Macro && IsMacro())    inKZ = true;
   
   if(!inKZ) return false;
   
   // Adaptive: check if this session is still enabled
   int sess = GetCurrentSession();
   if(UseAdaptive && sess >= 0 && !g_sessionEnabled[sess]) return false;
   
   return true;
}

//+------------------------------------------------------------------+
//| ADR FILTER                                                        |
//+------------------------------------------------------------------+
bool IsADROK() {
   double adrSum = 0;
   for(int i = 1; i <= ADR_Lookback; i++) {
      adrSum += iHigh(NULL, PERIOD_D1, i) - iLow(NULL, PERIOD_D1, i);
   }
   double adr = adrSum / ADR_Lookback;
   
   double todayRange = iHigh(NULL, PERIOD_D1, 0) - iLow(NULL, PERIOD_D1, 0);
   double usedPct = (adr > 0) ? (todayRange / adr) * 100.0 : 0;
   
   return usedPct < ADR_MaxUsedPct;
}

//+------------------------------------------------------------------+
//| ENTRY LOGIC                                                       |
//+------------------------------------------------------------------+
void CheckForEntry(double atr14) {
   
   bool canLong  = !ShortOnly && (g_structureBias == 1);
   bool canShort = !LongOnly  && (g_structureBias == -1);
   
   // HTF bias filter
   if(UseHTFBias) {
      if(canLong && g_htfBias == -1) canLong = false;
      if(canShort && g_htfBias == 1) canShort = false;
   }
   
   if(!canLong && !canShort) return;
   
   //--- Check each entry type and build confluence score
   double fvgTop = 0, fvgBot = 0;
   double obTop = 0, obBot = 0;
   
   // Long confluence
   if(canLong) {
      int confluence = 0;
      int bestEntry = -1;
      double entryPrice = Ask;
      double sl = 0;
      
      // FVG
      bool fvgTrigger = false;
      if(UseFVG && FindNearestFVG(1, fvgTop, fvgBot)) {
         if(Low[0] <= fvgTop && Close[0] > fvgBot) {
            fvgTrigger = true;
            confluence++;
            if(bestEntry < 0) { bestEntry = ENTRY_FVG; entryPrice = GetFVGEntry(fvgTop, fvgBot, 1); }
         }
      }
      
      // OB
      bool obTrigger = false;
      if(UseOB && FindNearestOB(1, obTop, obBot)) {
         if(Low[0] <= obTop && Close[0] > obBot) {
            obTrigger = true;
            confluence++;
            if(bestEntry < 0) { bestEntry = ENTRY_OB; }
         }
      }
      
      // OTE
      bool oteTrigger = false;
      if(UseOTE && IsInOTEZone() && g_oteDirection == 1) {
         oteTrigger = true;
         confluence++;
         if(bestEntry < 0) { bestEntry = ENTRY_OTE; }
      }
      
      // Liquidity sweep
      bool liqTrigger = IsBullishLiqSweep();
      if(liqTrigger) {
         confluence++;
         if(bestEntry < 0) { bestEntry = ENTRY_LIQSWEEP; }
      }
      
      // HTF alignment bonus
      if(UseHTFBias && g_htfBias == 1) confluence++;
      
      // Adaptive weight adjustment
      double adaptedConf = confluence;
      if(UseAdaptive && bestEntry >= 0) {
         adaptedConf = confluence * g_entryWeight[bestEntry];
         // Skip if entry type's win rate is too low
         if(g_entryTotal[bestEntry] >= 10 && g_entryWinRate[bestEntry] < Adapt_MinWinRate) return;
      }
      
      if(adaptedConf >= MinConfluence && bestEntry >= 0) {
         sl = CalcStopLoss(1, atr14, fvgBot, obBot);
         if(sl > 0 && Ask > sl) {
            ExecuteTrade(OP_BUY, Ask, sl, bestEntry, confluence);
         }
      }
   }
   
   // Short confluence
   if(canShort) {
      int confluence = 0;
      int bestEntry = -1;
      double sl = 0;
      
      bool fvgTrigger = false;
      if(UseFVG && FindNearestFVG(-1, fvgTop, fvgBot)) {
         if(High[0] >= fvgBot && Close[0] < fvgTop) {
            fvgTrigger = true;
            confluence++;
            if(bestEntry < 0) { bestEntry = ENTRY_FVG; }
         }
      }
      
      bool obTrigger = false;
      if(UseOB && FindNearestOB(-1, obTop, obBot)) {
         if(High[0] >= obBot && Close[0] < obTop) {
            obTrigger = true;
            confluence++;
            if(bestEntry < 0) { bestEntry = ENTRY_OB; }
         }
      }
      
      bool oteTrigger = false;
      if(UseOTE && IsInOTEZone() && g_oteDirection == -1) {
         oteTrigger = true;
         confluence++;
         if(bestEntry < 0) { bestEntry = ENTRY_OTE; }
      }
      
      bool liqTrigger = IsBearishLiqSweep();
      if(liqTrigger) {
         confluence++;
         if(bestEntry < 0) { bestEntry = ENTRY_LIQSWEEP; }
      }
      
      if(UseHTFBias && g_htfBias == -1) confluence++;
      
      double adaptedConf = confluence;
      if(UseAdaptive && bestEntry >= 0) {
         adaptedConf = confluence * g_entryWeight[bestEntry];
         if(g_entryTotal[bestEntry] >= 10 && g_entryWinRate[bestEntry] < Adapt_MinWinRate) return;
      }
      
      if(adaptedConf >= MinConfluence && bestEntry >= 0) {
         sl = CalcStopLoss(-1, atr14, fvgTop, obTop);
         if(sl > 0 && Bid < sl) {
            ExecuteTrade(OP_SELL, Bid, sl, bestEntry, confluence);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| STOP LOSS CALCULATION                                             |
//+------------------------------------------------------------------+
double CalcStopLoss(int dir, double atr14, double fvgLevel, double obLevel) {
   double buffer = atr14 * SL_BufferATR;
   double sl = 0;
   
   if(SLType == SL_CANDLE_BODY) {
      if(dir == 1)
         sl = MathMin(Open[0], Close[0]) - buffer;
      else
         sl = MathMax(Open[0], Close[0]) + buffer;
   }
   else if(SLType == SL_FVG_INVALID) {
      if(dir == 1 && fvgLevel > 0)
         sl = fvgLevel - buffer;
      else if(dir == -1 && fvgLevel > 0)
         sl = fvgLevel + buffer;
      else  // fallback
         sl = (dir == 1) ? MathMin(Open[0], Close[0]) - buffer : MathMax(Open[0], Close[0]) + buffer;
   }
   else if(SLType == SL_OB_INVALID) {
      if(dir == 1 && obLevel > 0)
         sl = obLevel - buffer;
      else if(dir == -1 && obLevel > 0)
         sl = obLevel + buffer;
      else
         sl = (dir == 1) ? Low[0] - buffer : High[0] + buffer;
   }
   else { // Swing Point
      if(dir == 1 && g_lastSwingLow > 0)
         sl = g_lastSwingLow - buffer;
      else if(dir == -1 && g_lastSwingHigh > 0)
         sl = g_lastSwingHigh + buffer;
      else
         sl = (dir == 1) ? Low[0] - atr14 : High[0] + atr14;
   }
   
   return NormalizeDouble(sl, Digits);
}

//+------------------------------------------------------------------+
//| POSITION SIZING                                                   |
//+------------------------------------------------------------------+
double CalcLotSize(double entryPrice, double sl) {
   double riskAmount = AccountBalance() * (RiskPercent / 100.0);
   double slDistance = MathAbs(entryPrice - sl);
   
   if(slDistance < Point) return 0;
   
   // XAUUSD: 1 lot = 100 oz, 1 pip (0.1 on gold) = $10 per lot typically
   double tickValue = MarketInfo(Symbol(), MODE_TICKVALUE);
   double tickSize  = MarketInfo(Symbol(), MODE_TICKSIZE);
   
   if(tickValue <= 0 || tickSize <= 0) return 0;
   
   double slTicks = slDistance / tickSize;
   double lots = riskAmount / (slTicks * tickValue);
   
   // Adaptive: reduce after consecutive losses
   if(UseAdaptive && g_consecLosses >= Adapt_ConsecLossCut) {
      lots *= Adapt_LossReduction;
      Print("Adaptive: Reducing lot size after ", g_consecLosses, " consecutive losses");
   }
   
   // Clamp to broker limits
   double minLot  = MarketInfo(Symbol(), MODE_MINLOT);
   double maxLot  = MarketInfo(Symbol(), MODE_MAXLOT);
   double lotStep = MarketInfo(Symbol(), MODE_LOTSTEP);
   
   lots = MathMax(lots, minLot);
   lots = MathMin(lots, maxLot);
   lots = NormalizeDouble(MathFloor(lots / lotStep) * lotStep, 2);
   
   return lots;
}

//+------------------------------------------------------------------+
//| EXECUTE TRADE                                                     |
//+------------------------------------------------------------------+
void ExecuteTrade(int type, double price, double sl, int entryModel, int confluence) {
   double lots = CalcLotSize(price, sl);
   if(lots <= 0) return;
   
   double risk = MathAbs(price - sl);
   double tp1 = (type == OP_BUY) ? price + risk * TP1_RR : price - risk * TP1_RR;
   double tp2 = (type == OP_BUY) ? price + risk * TP2_RR : price - risk * TP2_RR;
   
   tp1 = NormalizeDouble(tp1, Digits);
   tp2 = NormalizeDouble(tp2, Digits);
   price = NormalizeDouble(price, Digits);
   
   string comment = StringConcatenate("ICT|", EntryTypeName(entryModel), "|C", confluence);
   
   int ticket = OrderSend(Symbol(), type, lots, price, 3, sl, tp1, comment, MagicNumber, 0, 
                           (type == OP_BUY) ? clrGreen : clrRed);
   
   if(ticket > 0) {
      g_openTicket = ticket;
      g_openSL = sl;
      g_openTP1 = tp1;
      g_openTP2 = tp2;
      g_openEntry = price;
      g_openType = type;
      g_openEntryModel = entryModel;
      g_openSession = GetCurrentSession();
      g_tp1Hit = false;
      g_openLots = lots;
      g_dailyTrades++;
      
      if(g_oteActive) g_oteActive = false;
      
      Print("TRADE OPENED: ", (type == OP_BUY) ? "BUY" : "SELL", 
            " | Entry: ", EntryTypeName(entryModel),
            " | Lots: ", lots, " | Price: ", price, 
            " | SL: ", sl, " | TP1: ", tp1, " | TP2: ", tp2,
            " | Confluence: ", confluence);
      
      LogTrade("OPEN", type, price, sl, lots, entryModel, confluence);
   } else {
      Print("ORDER FAILED: Error ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| TRADE MANAGEMENT                                                  |
//+------------------------------------------------------------------+
void ManageOpenTrade() {
   if(g_openTicket <= 0) return;
   if(!OrderSelect(g_openTicket, SELECT_BY_TICKET)) return;
   if(OrderCloseTime() > 0) {
      // Trade was closed — record result
      RecordTradeResult();
      g_openTicket = -1;
      return;
   }
   
   double atr14 = iATR(NULL, 0, 14, 0);
   
   //--- Check TP1 hit for partial close + BE move
   if(!g_tp1Hit) {
      bool tp1Reached = false;
      if(g_openType == OP_BUY && Bid >= g_openTP1) tp1Reached = true;
      if(g_openType == OP_SELL && Ask <= g_openTP1) tp1Reached = true;
      
      if(tp1Reached) {
         // Partial close at TP1
         double closeQty = NormalizeDouble(g_openLots * (TP1_ClosePct / 100.0), 2);
         double minLot = MarketInfo(Symbol(), MODE_MINLOT);
         if(closeQty >= minLot) {
            double closePrice = (g_openType == OP_BUY) ? Bid : Ask;
            bool closed = OrderClose(g_openTicket, closeQty, closePrice, 3, clrYellow);
            if(closed) {
               Print("TP1 HIT: Partial close ", closeQty, " lots at ", closePrice);
            }
         }
         
         // Move SL to breakeven
         if(MoveSLtoBE) {
            double newSL = NormalizeDouble(g_openEntry + (g_openType == OP_BUY ? Point : -Point), Digits);
            if(OrderSelect(g_openTicket, SELECT_BY_TICKET) && OrderCloseTime() == 0) {
               bool modified = OrderModify(g_openTicket, OrderOpenPrice(), newSL, g_openTP2, 0, clrBlue);
               if(modified) {
                  g_openSL = newSL;
                  Print("SL moved to breakeven: ", newSL);
               }
            }
         }
         
         g_tp1Hit = true;
      }
   }
   
   //--- Trailing stop after TP1
   if(g_tp1Hit && UseTrailingStop && OrderSelect(g_openTicket, SELECT_BY_TICKET) && OrderCloseTime() == 0) {
      double trailDist = atr14 * TrailATR;
      double newSL = 0;
      
      if(g_openType == OP_BUY) {
         newSL = NormalizeDouble(Bid - trailDist, Digits);
         if(newSL > OrderStopLoss() && newSL > g_openEntry) {
            OrderModify(g_openTicket, OrderOpenPrice(), newSL, OrderTakeProfit(), 0, clrBlue);
         }
      } else {
         newSL = NormalizeDouble(Ask + trailDist, Digits);
         if(newSL < OrderStopLoss() && newSL < g_openEntry) {
            OrderModify(g_openTicket, OrderOpenPrice(), newSL, OrderTakeProfit(), 0, clrRed);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| RECORD TRADE RESULT + ADAPTIVE UPDATE                             |
//+------------------------------------------------------------------+
void RecordTradeResult() {
   if(!OrderSelect(g_openTicket, SELECT_BY_TICKET)) return;
   
   double profit = OrderProfit() + OrderSwap() + OrderCommission();
   bool isWin = profit > 0;
   
   // Update consecutive loss/win counter
   if(isWin) {
      g_consecLosses = 0;
   } else {
      g_consecLosses++;
   }
   
   // Update entry type stats
   if(g_openEntryModel >= 0 && g_openEntryModel < ENTRY_TYPES) {
      g_entryTotal[g_openEntryModel]++;
      if(isWin) g_entryWins[g_openEntryModel]++;
      
      if(g_entryTotal[g_openEntryModel] > 0) {
         g_entryWinRate[g_openEntryModel] = (double)g_entryWins[g_openEntryModel] / (double)g_entryTotal[g_openEntryModel];
      }
      
      // Update adaptive weight: winning types get boosted, losing types get reduced
      RecalcWeights();
   }
   
   // Update session stats
   if(g_openSession >= 0 && g_openSession < SESSION_TYPES) {
      g_sessionTotal[g_openSession]++;
      if(isWin) g_sessionWins[g_openSession]++;
      
      if(g_sessionTotal[g_openSession] > 0) {
         g_sessionWinRate[g_openSession] = (double)g_sessionWins[g_openSession] / (double)g_sessionTotal[g_openSession];
      }
      
      // Disable session if enough data and win rate too low
      if(g_sessionTotal[g_openSession] >= 15 && g_sessionWinRate[g_openSession] < Adapt_MinWinRate) {
         g_sessionEnabled[g_openSession] = false;
         Print("ADAPTIVE: Disabled session ", SessionName(g_openSession), 
               " — win rate ", DoubleToStr(g_sessionWinRate[g_openSession] * 100, 1), "%");
      } else {
         g_sessionEnabled[g_openSession] = true;
      }
   }
   
   // Log to CSV
   LogTrade("CLOSE", g_openType, OrderClosePrice(), OrderStopLoss(), OrderLots(), 
            g_openEntryModel, 0);
   LogResult(profit, isWin);
   
   // Save state
   SaveAdaptiveState();
   
   Print("TRADE CLOSED: ", isWin ? "WIN" : "LOSS", " | P/L: $", DoubleToStr(profit, 2),
         " | Entry: ", EntryTypeName(g_openEntryModel),
         " | WinRate: ", DoubleToStr(g_entryWinRate[g_openEntryModel] * 100, 1), "%",
         " | ConsecLoss: ", g_consecLosses);
}

void RecalcWeights() {
   // Find average win rate across all types with data
   double avgWR = 0;
   int count = 0;
   for(int i = 0; i < ENTRY_TYPES; i++) {
      if(g_entryTotal[i] >= 5) {
         avgWR += g_entryWinRate[i];
         count++;
      }
   }
   if(count > 0) avgWR /= count;
   else avgWR = 0.5;
   
   // Weight = entryWinRate / avgWinRate (so above-avg gets > 1.0, below gets < 1.0)
   for(int i = 0; i < ENTRY_TYPES; i++) {
      if(g_entryTotal[i] >= 5 && avgWR > 0) {
         g_entryWeight[i] = g_entryWinRate[i] / avgWR;
         // Clamp between 0.3 and 2.0
         g_entryWeight[i] = MathMax(0.3, MathMin(2.0, g_entryWeight[i]));
      } else {
         g_entryWeight[i] = 1.0;  // neutral until enough data
      }
   }
   
   Print("ADAPTIVE WEIGHTS: FVG=", DoubleToStr(g_entryWeight[0], 2),
         " OB=", DoubleToStr(g_entryWeight[1], 2),
         " OTE=", DoubleToStr(g_entryWeight[2], 2),
         " Liq=", DoubleToStr(g_entryWeight[3], 2),
         " BB=", DoubleToStr(g_entryWeight[4], 2));
}

//+------------------------------------------------------------------+
//| CLOSE ALL POSITIONS                                               |
//+------------------------------------------------------------------+
void CloseAllPositions(string reason) {
   for(int i = OrdersTotal() - 1; i >= 0; i--) {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) {
         if(OrderSymbol() == Symbol() && OrderMagicNumber() == MagicNumber) {
            double price = (OrderType() == OP_BUY) ? Bid : Ask;
            bool closed = OrderClose(OrderTicket(), OrderLots(), price, 3, clrWhite);
            if(closed) Print("Position closed: ", reason);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| CSV TRADE LOG                                                     |
//+------------------------------------------------------------------+
void LogTrade(string action, int type, double price, double sl, double lots, int entryModel, int confluence) {
   string filename = g_logFile + "_trades.csv";
   int handle = FileOpen(filename, FILE_READ | FILE_WRITE | FILE_CSV, ',');
   if(handle == INVALID_HANDLE) return;
   
   // Seek to end
   FileSeek(handle, 0, SEEK_END);
   
   // Write header if new file
   if(FileTell(handle) == 0) {
      FileWrite(handle, "Time", "Action", "Type", "Price", "SL", "Lots", 
                "EntryModel", "Confluence", "Session", "StructBias", "HTFBias",
                "ConsecLosses", "Balance");
   }
   
   FileWrite(handle, TimeToStr(TimeCurrent(), TIME_DATE | TIME_MINUTES),
             action,
             (type == OP_BUY) ? "BUY" : "SELL",
             DoubleToStr(price, Digits),
             DoubleToStr(sl, Digits),
             DoubleToStr(lots, 2),
             EntryTypeName(entryModel),
             IntegerToString(confluence),
             SessionName(GetCurrentSession()),
             IntegerToString(g_structureBias),
             IntegerToString(g_htfBias),
             IntegerToString(g_consecLosses),
             DoubleToStr(AccountBalance(), 2));
   
   FileClose(handle);
}

void LogResult(double profit, bool isWin) {
   string filename = g_logFile + "_results.csv";
   int handle = FileOpen(filename, FILE_READ | FILE_WRITE | FILE_CSV, ',');
   if(handle == INVALID_HANDLE) return;
   
   FileSeek(handle, 0, SEEK_END);
   
   if(FileTell(handle) == 0) {
      FileWrite(handle, "Time", "Result", "Profit", "EntryModel", "Session",
                "WR_FVG", "WR_OB", "WR_OTE", "WR_Liq",
                "W_FVG", "W_OB", "W_OTE", "W_Liq",
                "Balance");
   }
   
   FileWrite(handle, TimeToStr(TimeCurrent(), TIME_DATE | TIME_MINUTES),
             isWin ? "WIN" : "LOSS",
             DoubleToStr(profit, 2),
             EntryTypeName(g_openEntryModel),
             SessionName(g_openSession),
             DoubleToStr(g_entryWinRate[0] * 100, 1),
             DoubleToStr(g_entryWinRate[1] * 100, 1),
             DoubleToStr(g_entryWinRate[2] * 100, 1),
             DoubleToStr(g_entryWinRate[3] * 100, 1),
             DoubleToStr(g_entryWeight[0], 2),
             DoubleToStr(g_entryWeight[1], 2),
             DoubleToStr(g_entryWeight[2], 2),
             DoubleToStr(g_entryWeight[3], 2),
             DoubleToStr(AccountBalance(), 2));
   
   FileClose(handle);
}

//+------------------------------------------------------------------+
//| ADAPTIVE STATE PERSISTENCE                                        |
//+------------------------------------------------------------------+
void SaveAdaptiveState() {
   string filename = g_logFile + "_state.dat";
   int handle = FileOpen(filename, FILE_WRITE | FILE_BIN);
   if(handle == INVALID_HANDLE) return;
   
   // Entry stats
   for(int i = 0; i < ENTRY_TYPES; i++) {
      FileWriteDouble(handle, g_entryWinRate[i]);
      FileWriteDouble(handle, g_entryWeight[i]);
      FileWriteInteger(handle, g_entryWins[i]);
      FileWriteInteger(handle, g_entryTotal[i]);
   }
   
   // Session stats
   for(int i = 0; i < SESSION_TYPES; i++) {
      FileWriteDouble(handle, g_sessionWinRate[i]);
      FileWriteInteger(handle, g_sessionWins[i]);
      FileWriteInteger(handle, g_sessionTotal[i]);
      FileWriteInteger(handle, g_sessionEnabled[i] ? 1 : 0);
   }
   
   FileWriteInteger(handle, g_consecLosses);
   
   FileClose(handle);
}

void LoadAdaptiveState() {
   string filename = g_logFile + "_state.dat";
   if(!FileIsExist(filename)) return;
   
   int handle = FileOpen(filename, FILE_READ | FILE_BIN);
   if(handle == INVALID_HANDLE) return;
   
   // Entry stats
   for(int i = 0; i < ENTRY_TYPES; i++) {
      if(FileIsEnding(handle)) break;
      g_entryWinRate[i] = FileReadDouble(handle);
      g_entryWeight[i]  = FileReadDouble(handle);
      g_entryWins[i]    = FileReadInteger(handle);
      g_entryTotal[i]   = FileReadInteger(handle);
   }
   
   // Session stats
   for(int i = 0; i < SESSION_TYPES; i++) {
      if(FileIsEnding(handle)) break;
      g_sessionWinRate[i] = FileReadDouble(handle);
      g_sessionWins[i]    = FileReadInteger(handle);
      g_sessionTotal[i]   = FileReadInteger(handle);
      g_sessionEnabled[i] = (FileReadInteger(handle) == 1);
   }
   
   if(!FileIsEnding(handle))
      g_consecLosses = FileReadInteger(handle);
   
   FileClose(handle);
   
   Print("Adaptive state loaded: ", 
         "FVG WR=", DoubleToStr(g_entryWinRate[0]*100,1), "% ",
         "OB WR=", DoubleToStr(g_entryWinRate[1]*100,1), "% ",
         "OTE WR=", DoubleToStr(g_entryWinRate[2]*100,1), "% ",
         "Liq WR=", DoubleToStr(g_entryWinRate[3]*100,1), "%");
}

//+------------------------------------------------------------------+
//| HELPER FUNCTIONS                                                  |
//+------------------------------------------------------------------+
string EntryTypeName(int type) {
   switch(type) {
      case ENTRY_FVG:      return "FVG";
      case ENTRY_OB:       return "OrderBlock";
      case ENTRY_OTE:      return "OTE";
      case ENTRY_LIQSWEEP: return "LiqSweep";
      case ENTRY_BREAKER:  return "Breaker";
      default:             return "Unknown";
   }
}

string SessionName(int sess) {
   switch(sess) {
      case SESSION_LONDON:    return "London";
      case SESSION_NY_AM:     return "NY_AM";
      case SESSION_NY_PM:     return "NY_PM";
      case SESSION_SILVER_AM: return "SilverAM";
      case SESSION_SILVER_PM: return "SilverPM";
      case SESSION_MACRO:     return "Macro";
      default:                return "None";
   }
}

//+------------------------------------------------------------------+
//| ON-CHART DASHBOARD                                                |
//+------------------------------------------------------------------+
void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam) {
   // Redraw dashboard on chart events
}

int OnCalculate(const int rates_total, const int prev_calculated, const datetime &time[],
                const double &open[], const double &high[], const double &low[], const double &close[],
                const long &tick_volume[], const long &volume[], const int &spread[]) {
   return rates_total;
}

//--- Dashboard drawing (called from OnTick for simplicity)
void DrawDashboard() {
   string prefix = "ICT_";
   int x = 10, y = 30;
   int lineH = 18;
   
   // Background
   ObjectCreate(0, prefix + "bg", OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_XDISTANCE, 5);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_YDISTANCE, 25);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_XSIZE, 280);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_YSIZE, 260);
   ObjectSetInteger(0, prefix + "bg", OBJPROP_BGCOLOR, C'17,17,19');
   ObjectSetInteger(0, prefix + "bg", OBJPROP_BORDER_COLOR, C'39,39,42');
   ObjectSetInteger(0, prefix + "bg", OBJPROP_CORNER, CORNER_LEFT_UPPER);
   
   // Title
   CreateLabel(prefix + "title", "ICT Gold EA v1.0", x, y, clrWhite, 10);
   y += lineH + 4;
   
   // Structure
   string biasStr = (g_structureBias == 1) ? "BULLISH" : (g_structureBias == -1) ? "BEARISH" : "NEUTRAL";
   color biasClr = (g_structureBias == 1) ? clrLime : (g_structureBias == -1) ? clrRed : clrGray;
   CreateLabel(prefix + "bias", "Structure: " + biasStr, x, y, biasClr, 9);
   y += lineH;
   
   // HTF
   string htfStr = (g_htfBias == 1) ? "BULL" : (g_htfBias == -1) ? "BEAR" : "FLAT";
   CreateLabel(prefix + "htf", "HTF Bias: " + htfStr, x, y, clrSilver, 9);
   y += lineH;
   
   // Session
   int sess = GetCurrentSession();
   string sessStr = (sess >= 0) ? SessionName(sess) : "Off-hours";
   CreateLabel(prefix + "session", "Session: " + sessStr, x, y, clrSilver, 9);
   y += lineH;
   
   // Daily trades
   CreateLabel(prefix + "daily", "Trades Today: " + IntegerToString(g_dailyTrades) + "/" + IntegerToString(MaxDailyTrades), x, y, clrSilver, 9);
   y += lineH;
   
   // Adaptive stats
   y += 4;
   CreateLabel(prefix + "adapt", "── Adaptive Stats ──", x, y, clrGold, 9);
   y += lineH;
   
   for(int i = 0; i < 4; i++) {
      string name = EntryTypeName(i);
      string stats = name + ": " + DoubleToStr(g_entryWinRate[i]*100,0) + "% (" + IntegerToString(g_entryTotal[i]) + ") w:" + DoubleToStr(g_entryWeight[i],2);
      color c = (g_entryWinRate[i] >= 0.5) ? clrLime : (g_entryTotal[i] < 5) ? clrGray : clrOrangeRed;
      CreateLabel(prefix + "wr" + IntegerToString(i), stats, x, y, c, 8);
      y += lineH;
   }
   
   // Consecutive losses
   color lossClr = (g_consecLosses >= Adapt_ConsecLossCut) ? clrRed : clrSilver;
   CreateLabel(prefix + "closs", "Consec Losses: " + IntegerToString(g_consecLosses), x, y, lossClr, 9);
}

void CreateLabel(string name, string text, int x, int y, color clr, int fontSize) {
   if(ObjectFind(0, name) < 0) {
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
   }
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, fontSize);
}
//+------------------------------------------------------------------+
