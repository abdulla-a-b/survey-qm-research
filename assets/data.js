/* =========================================================================
   Q-STUDY DATA  —  Meeting Practices in Bangladesh
   Edit statements / config here. Nothing else needs to change.
   ========================================================================= */

/* ---- 1. SUBMISSION ENDPOINT ----
   Paste your Google Apps Script Web App URL between the quotes.
   (See README.md → "Connect Google Sheets")                              */
const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbxe_U_8WoGfKVtNkcUoiRPTSw52NixTSh7g42Eos4uael3jvf2newANXN3QVklIO-TseQ/exec";

/* ---- 2. FORCED-DISTRIBUTION SHAPE (Guided Q-Sort) ----
   Columns run from -5 to +5. The numbers below are how many cards each
   column accepts. They MUST sum to the number of statements (40).        */
const DISTRIBUTION = {
  "-5": 2, "-4": 2, "-3": 3, "-2": 4, "-1": 5,
  "0": 8,
  "1": 5, "2": 4, "3": 3, "4": 2, "5": 2
};

/* ---- 3. Q-STATEMENTS (40) ----
   id     : stable code, also used as the spreadsheet column header
   theme  : group label
   en/bn  : statement text                                                */
const STATEMENTS = [
  // Theme A — Meeting Purpose
  { id: "A1", theme: "Meeting Purpose", themeBn: "সভার উদ্দেশ্য", en: "Most meetings in my organization are necessary.", bn: "আমার প্রতিষ্ঠানের অধিকাংশ সভা প্রয়োজনীয়।" },
  { id: "A2", theme: "Meeting Purpose", themeBn: "সভার উদ্দেশ্য", en: "Many meetings could be replaced by emails or messages.", bn: "অনেক সভা ইমেইল বা বার্তা দিয়ে প্রতিস্থাপন করা যেত।" },
  { id: "A3", theme: "Meeting Purpose", themeBn: "সভার উদ্দেশ্য", en: "Meetings help me understand organizational priorities.", bn: "সভা আমাকে প্রতিষ্ঠানের অগ্রাধিকার বুঝতে সাহায্য করে।" },
  { id: "A4", theme: "Meeting Purpose", themeBn: "সভার উদ্দেশ্য", en: "Meetings often waste valuable work time.", bn: "সভা প্রায়ই মূল্যবান কর্মঘণ্টা নষ্ট করে।" },
  { id: "A5", theme: "Meeting Purpose", themeBn: "সভার উদ্দেশ্য", en: "Clear meeting objectives improve team performance.", bn: "সভার স্পষ্ট লক্ষ্য দলের কর্মক্ষমতা বাড়ায়।" },

  // Theme B — Leadership During Meetings
  { id: "B1", theme: "Leadership in Meetings", themeBn: "সভায় নেতৃত্ব", en: "Leaders encourage participation from everyone.", bn: "নেতারা সবাইকে অংশগ্রহণে উৎসাহিত করেন।" },
  { id: "B2", theme: "Leadership in Meetings", themeBn: "সভায় নেতৃত্ব", en: "Senior management dominates discussions.", bn: "ঊর্ধ্বতন ব্যবস্থাপনা আলোচনায় প্রাধান্য বিস্তার করে।" },
  { id: "B3", theme: "Leadership in Meetings", themeBn: "সভায় নেতৃত্ব", en: "Employees feel comfortable expressing disagreement.", bn: "কর্মীরা ভিন্নমত প্রকাশে স্বাচ্ছন্দ্য বোধ করেন।" },
  { id: "B4", theme: "Leadership in Meetings", themeBn: "সভায় নেতৃত্ব", en: "Meeting leaders effectively manage time.", bn: "সভা পরিচালকরা কার্যকরভাবে সময় ব্যবস্থাপনা করেন।" },
  { id: "B5", theme: "Leadership in Meetings", themeBn: "সভায় নেতৃত্ব", en: "Decisions are usually made by senior leaders before meetings begin.", bn: "সভা শুরুর আগেই সাধারণত ঊর্ধ্বতন নেতারা সিদ্ধান্ত নিয়ে নেন।" },

  // Theme C — Productivity
  { id: "C1", theme: "Productivity", themeBn: "উৎপাদনশীলতা", en: "Meetings improve work coordination.", bn: "সভা কাজের সমন্বয় উন্নত করে।" },
  { id: "C2", theme: "Productivity", themeBn: "উৎপাদনশীলতা", en: "Meetings interrupt important work.", bn: "সভা গুরুত্বপূর্ণ কাজে ব্যাঘাত ঘটায়।" },
  { id: "C3", theme: "Productivity", themeBn: "উৎপাদনশীলতা", en: "Too many meetings reduce productivity.", bn: "অতিরিক্ত সভা উৎপাদনশীলতা কমায়।" },
  { id: "C4", theme: "Productivity", themeBn: "উৎপাদনশীলতা", en: "Meetings help solve problems faster.", bn: "সভা দ্রুত সমস্যা সমাধানে সাহায্য করে।" },
  { id: "C5", theme: "Productivity", themeBn: "উৎপাদনশীলতা", en: "Follow-up actions are clearly assigned.", bn: "পরবর্তী করণীয় স্পষ্টভাবে নির্ধারণ করা হয়।" },

  // Theme D — Psychological Safety
  { id: "D1", theme: "Psychological Safety", themeBn: "মানসিক নিরাপত্তা", en: "Employees can openly share ideas.", bn: "কর্মীরা খোলাখুলিভাবে মতামত দিতে পারেন।" },
  { id: "D2", theme: "Psychological Safety", themeBn: "মানসিক নিরাপত্তা", en: "People remain silent to avoid conflict.", bn: "দ্বন্দ্ব এড়াতে মানুষ চুপ থাকে।" },
  { id: "D3", theme: "Psychological Safety", themeBn: "মানসিক নিরাপত্তা", en: "Mistakes can be discussed without fear.", bn: "ভুল নিয়ে নির্ভয়ে আলোচনা করা যায়।" },
  { id: "D4", theme: "Psychological Safety", themeBn: "মানসিক নিরাপত্তা", en: "Different opinions are welcomed.", bn: "ভিন্ন মতামতকে স্বাগত জানানো হয়।" },
  { id: "D5", theme: "Psychological Safety", themeBn: "মানসিক নিরাপত্তা", en: "Meetings promote trust among team members.", bn: "সভা দলের সদস্যদের মধ্যে আস্থা বাড়ায়।" },

  // Theme E — Bangladesh Workplace Culture
  { id: "E1", theme: "Workplace Culture", themeBn: "কর্মক্ষেত্রের সংস্কৃতি", en: "Respect for hierarchy limits open discussion.", bn: "পদমর্যাদার প্রতি শ্রদ্ধা খোলামেলা আলোচনাকে সীমিত করে।" },
  { id: "E2", theme: "Workplace Culture", themeBn: "কর্মক্ষেত্রের সংস্কৃতি", en: "Junior employees hesitate to challenge seniors.", bn: "জুনিয়র কর্মীরা সিনিয়রদের প্রশ্ন করতে দ্বিধা করেন।" },
  { id: "E3", theme: "Workplace Culture", themeBn: "কর্মক্ষেত্রের সংস্কৃতি", en: "Organizational politics affects meeting outcomes.", bn: "প্রাতিষ্ঠানিক রাজনীতি সভার ফলাফলকে প্রভাবিত করে।" },
  { id: "E4", theme: "Workplace Culture", themeBn: "কর্মক্ষেত্রের সংস্কৃতি", en: "Meetings are sometimes held only to satisfy formal requirements.", bn: "কখনো কখনো শুধু আনুষ্ঠানিকতা রক্ষার জন্য সভা করা হয়।" },
  { id: "E5", theme: "Workplace Culture", themeBn: "কর্মক্ষেত্রের সংস্কৃতি", en: "Relationship management is more important than facts in meetings.", bn: "সভায় তথ্যের চেয়ে সম্পর্ক ব্যবস্থাপনা বেশি গুরুত্বপূর্ণ।" },

  // Theme F — Digital & Hybrid Meetings
  { id: "F1", theme: "Digital & Hybrid", themeBn: "ডিজিটাল ও হাইব্রিড", en: "Online meetings are as effective as physical meetings.", bn: "অনলাইন সভা সশরীরে সভার মতোই কার্যকর।" },
  { id: "F2", theme: "Digital & Hybrid", themeBn: "ডিজিটাল ও হাইব্রিড", en: "Hybrid meetings create communication challenges.", bn: "হাইব্রিড সভা যোগাযোগে চ্যালেঞ্জ তৈরি করে।" },
  { id: "F3", theme: "Digital & Hybrid", themeBn: "ডিজিটাল ও হাইব্রিড", en: "Technology improves collaboration.", bn: "প্রযুক্তি সহযোগিতা উন্নত করে।" },
  { id: "F4", theme: "Digital & Hybrid", themeBn: "ডিজিটাল ও হাইব্রিড", en: "Participants multitask during virtual meetings.", bn: "ভার্চুয়াল সভায় অংশগ্রহণকারীরা একসাথে একাধিক কাজ করেন।" },
  { id: "F5", theme: "Digital & Hybrid", themeBn: "ডিজিটাল ও হাইব্রিড", en: "Virtual meetings reduce engagement.", bn: "ভার্চুয়াল সভা সম্পৃক্ততা কমায়।" },

  // Theme G — Meeting Timing & Neuroscience
  { id: "G1", theme: "Timing & Energy", themeBn: "সময় ও কর্মশক্তি", en: "My concentration varies during different times of day.", bn: "দিনের বিভিন্ন সময়ে আমার মনোযোগ ভিন্ন হয়।" },
  { id: "G2", theme: "Timing & Energy", themeBn: "সময় ও কর্মশক্তি", en: "Morning meetings are more productive.", bn: "সকালের সভা বেশি ফলপ্রসূ।" },
  { id: "G3", theme: "Timing & Energy", themeBn: "সময় ও কর্মশক্তি", en: "Afternoon meetings reduce engagement.", bn: "বিকেলের সভা সম্পৃক্ততা কমায়।" },
  { id: "G4", theme: "Timing & Energy", themeBn: "সময় ও কর্মশক্তি", en: "Meeting schedules should consider employee energy levels.", bn: "সভার সময়সূচিতে কর্মীদের কর্মশক্তি বিবেচনা করা উচিত।" },
  { id: "G5", theme: "Timing & Energy", themeBn: "সময় ও কর্মশক্তি", en: "Different types of meetings should occur at different times.", bn: "বিভিন্ন ধরনের সভা বিভিন্ন সময়ে হওয়া উচিত।" },

  // Theme H — Innovation & Team Performance
  { id: "H1", theme: "Innovation & Performance", themeBn: "উদ্ভাবন ও কর্মক্ষমতা", en: "Brainstorming meetings generate valuable ideas.", bn: "ব্রেইনস্টর্মিং সভা মূল্যবান ধারণা তৈরি করে।" },
  { id: "H2", theme: "Innovation & Performance", themeBn: "উদ্ভাবন ও কর্মক্ষমতা", en: "Meetings encourage innovation.", bn: "সভা উদ্ভাবনকে উৎসাহিত করে।" },
  { id: "H3", theme: "Innovation & Performance", themeBn: "উদ্ভাবন ও কর্মক্ষমতা", en: "Cross-functional meetings improve performance.", bn: "আন্তঃবিভাগীয় সভা কর্মক্ষমতা উন্নত করে।" },
  { id: "H4", theme: "Innovation & Performance", themeBn: "উদ্ভাবন ও কর্মক্ষমতা", en: "Too much discussion delays decisions.", bn: "অতিরিক্ত আলোচনা সিদ্ধান্ত বিলম্বিত করে।" },
  { id: "H5", theme: "Innovation & Performance", themeBn: "উদ্ভাবন ও কর্মক্ষমতা", en: "Well-designed meetings improve organizational performance.", bn: "সুপরিকল্পিত সভা প্রাতিষ্ঠানিক কর্মক্ষমতা উন্নত করে।" }
];

/* ---- 4. DEMOGRAPHIC QUESTIONS ---- */
const DEMOGRAPHICS = [
  { id: "role", en: "Your role", bn: "আপনার পদমর্যাদা", type: "select",
    options: [
      { v: "Senior leadership", en: "Senior leadership / Executive", bn: "ঊর্ধ্বতন নেতৃত্ব / নির্বাহী" },
      { v: "Mid-level manager", en: "Mid-level manager", bn: "মধ্যম পর্যায়ের ব্যবস্থাপক" },
      { v: "Team lead / Supervisor", en: "Team lead / Supervisor", bn: "টিম লিড / সুপারভাইজার" },
      { v: "Employee / Individual contributor", en: "Employee / Individual contributor", bn: "কর্মী / স্বতন্ত্র অবদানকারী" },
      { v: "Intern / Entry level", en: "Intern / Entry level", bn: "ইন্টার্ন / প্রবেশ পর্যায়" }
    ] },
  { id: "sector", en: "Industry / Sector", bn: "শিল্প / খাত", type: "select",
    options: [
      { v: "RMG / Textiles", en: "RMG / Textiles", bn: "তৈরি পোশাক / টেক্সটাইল" },
      { v: "Manufacturing", en: "Manufacturing (other)", bn: "উৎপাদন (অন্যান্য)" },
      { v: "Banking / Finance", en: "Banking / Finance", bn: "ব্যাংকিং / অর্থ" },
      { v: "IT / Software", en: "IT / Software", bn: "আইটি / সফটওয়্যার" },
      { v: "NGO / Development", en: "NGO / Development", bn: "এনজিও / উন্নয়ন" },
      { v: "Education", en: "Education", bn: "শিক্ষা" },
      { v: "Healthcare", en: "Healthcare", bn: "স্বাস্থ্যসেবা" },
      { v: "Government", en: "Government / Public", bn: "সরকারি / পাবলিক" },
      { v: "Other", en: "Other", bn: "অন্যান্য" }
    ] },
  { id: "orgSize", en: "Organization size", bn: "প্রতিষ্ঠানের আকার", type: "select",
    options: [
      { v: "1-50", en: "1–50 employees", bn: "১–৫০ জন" },
      { v: "51-250", en: "51–250 employees", bn: "৫১–২৫০ জন" },
      { v: "251-1000", en: "251–1,000 employees", bn: "২৫১–১,০০০ জন" },
      { v: "1000+", en: "More than 1,000", bn: "১,০০০ এর বেশি" }
    ] },
  { id: "experience", en: "Years of work experience", bn: "কর্ম অভিজ্ঞতা (বছর)", type: "select",
    options: [
      { v: "0-2", en: "0–2 years", bn: "০–২ বছর" },
      { v: "3-5", en: "3–5 years", bn: "৩–৫ বছর" },
      { v: "6-10", en: "6–10 years", bn: "৬–১০ বছর" },
      { v: "11-20", en: "11–20 years", bn: "১১–২০ বছর" },
      { v: "20+", en: "More than 20 years", bn: "২০ বছরের বেশি" }
    ] },
  { id: "workMode", en: "Where do you mostly work?", bn: "আপনি প্রধানত কোথায় কাজ করেন?", type: "select",
    options: [
      { v: "On-site", en: "Fully on-site", bn: "সম্পূর্ণ অফিসে" },
      { v: "Hybrid", en: "Hybrid", bn: "হাইব্রিড" },
      { v: "Remote", en: "Fully remote", bn: "সম্পূর্ণ দূরবর্তী" }
    ] },
  { id: "meetingLoad", en: "Hours per week in meetings", bn: "সপ্তাহে সভায় ব্যয়িত সময় (ঘণ্টা)", type: "select",
    options: [
      { v: "0-2", en: "Less than 2 hours", bn: "২ ঘণ্টার কম" },
      { v: "3-5", en: "3–5 hours", bn: "৩–৫ ঘণ্টা" },
      { v: "6-10", en: "6–10 hours", bn: "৬–১০ ঘণ্টা" },
      { v: "10+", en: "More than 10 hours", bn: "১০ ঘণ্টার বেশি" }
    ] },
  { id: "ageGroup", en: "Age group", bn: "বয়সের সীমা", type: "select",
    options: [
      { v: "18-24", en: "18–24", bn: "১৮–২৪" },
      { v: "25-34", en: "25–34", bn: "২৫–৩৪" },
      { v: "35-44", en: "35–44", bn: "৩৫–৪৪" },
      { v: "45-54", en: "45–54", bn: "৪৫–৫৪" },
      { v: "55+", en: "55+", bn: "৫৫+" }
    ] },
  { id: "gender", en: "Gender", bn: "লিঙ্গ", type: "select",
    options: [
      { v: "Woman", en: "Woman", bn: "নারী" },
      { v: "Man", en: "Man", bn: "পুরুষ" },
      { v: "Prefer not to say", en: "Prefer not to say", bn: "বলতে চাই না" }
    ] }
];

/* ---- 5. INTERFACE STRINGS (EN / BN) ---- */
const I18N = {
  en: {
    brandText: "Meeting Practices Study",
    welcomeEyebrow: "Academic Research · Q-Methodology",
    welcomeTitle: "From Meeting Fatigue to High-Performance Teams",
    welcomeSubtitle: "Understanding workplace meeting practices in Bangladesh",
    welcomeLede: "This is not a typical questionnaire. You will arrange <strong>40 viewpoints</strong> about workplace meetings into a ranking — from the ones you most agree with to the ones you most disagree with. There are no right answers; we want <em>your</em> perspective.",
    mcStatements: "statements", mcMinutes: "minutes", mcAnon: "anonymous",
    modeLabel: "Choose how you'd like to sort:",
    modeGuidedTitle: "Guided Q-Sort", modeGuidedDesc: "The classic method — place cards into a fixed pyramid. Most rigorous.",
    modeRec: "Recommended",
    modeFlexTitle: "Flexible Rating", modeFlexDesc: "Rate each statement freely from −5 to +5. Faster, fewer constraints.",
    consentText: "I am 18+ and voluntarily agree to take part. My anonymous responses may be used for academic research and publication.",
    resumeText: "We found a saved session.", resumeBtn: "Resume", freshBtn: "Start over",
    beginBtn: "Begin the study →",
    demoEyebrow: "A little about you", demoTitle: "Your context",
    demoSub: "These help us compare viewpoints across roles and sectors. No names, no contact details.",
    back: "← Back", continue: "Continue →",
    howEyebrow: "How it works", howStep1Title: "Sort into three piles",
    howStep1Desc: "First glance at each card and drop it into <em>Agree</em>, <em>Neutral</em>, or <em>Disagree</em>. Quick gut feeling.",
    howStep2Title: "Build the pyramid",
    howStep2Desc: "Place every card into the grid from −5 (strongly disagree) to +5 (strongly agree). Each column holds a fixed number of cards, so you'll compare and decide what matters most.",
    howStep2FlexTitle: "Rate each statement", howStep2FlexDesc: "Give every statement a score from −5 to +5. No limits on how many can share a score.",
    howStep3Title: "Tell us why", howStep3Desc: "A few short questions about your strongest choices, and you're done.",
    legendDisagree: "Strongly disagree", legendAgree: "Strongly agree", startSorting: "Start sorting →",
    coarseTitle: "First impressions", coarseSub1: "Card", coarseSub2: "of 40 — where does this belong?",
    bucketDisagree: "Disagree", bucketNeutral: "Neutral", bucketAgree: "Agree", undo: "↶ Undo last",
    fineTitle: "Build your ranking", fineRemaining: "cards left to place",
    trayTitle: "Cards to place", tfAll: "All", tfAgr: "Agree", tfNeu: "Neutral", tfDis: "Disagree",
    flexTitle: "Rate each statement", flexRated: "rated",
    reflectEyebrow: "Almost done", reflectTitle: "In your own words",
    reflectTopLabel: "You agreed most strongly with these. Why?",
    reflectBottomLabel: "You disagreed most strongly with these. Why?",
    reflectExtraLabel: "Anything else about meetings in your workplace? (optional)",
    submit: "Submit my responses →", submitting: "Sending…",
    doneTitle: "Thank you", doneMsg: "Your perspective has been recorded. It will help shape a Bangladesh-specific Meeting Excellence Framework.",
    download: "Download my responses",
    errTitle: "Couldn't send", errMsg: "Something went wrong sending your responses. Your answers are saved on this device — please check your connection and try again.",
    retry: "Try again",
    placeholderWhy: "Optional — a sentence or two…",
    fillAll: "Please answer every question to continue.",
    sortRest: "Place all cards to continue.",
    rateRest: "Rate every statement to continue."
  },
  bn: {
    brandText: "সভা অনুশীলন গবেষণা",
    welcomeEyebrow: "একাডেমিক গবেষণা · কিউ-পদ্ধতি",
    welcomeTitle: "সভার ক্লান্তি থেকে উচ্চ-কর্মক্ষম দল",
    welcomeSubtitle: "বাংলাদেশের কর্মক্ষেত্রে সভা অনুশীলন বোঝা",
    welcomeLede: "এটি সাধারণ কোনো প্রশ্নমালা নয়। আপনি কর্মক্ষেত্রের সভা সম্পর্কে <strong>৪০টি মতামত</strong> সাজাবেন — যেগুলোর সাথে আপনি সবচেয়ে বেশি একমত থেকে যেগুলোর সাথে সবচেয়ে বেশি দ্বিমত। কোনো সঠিক উত্তর নেই; আমরা <em>আপনার</em> দৃষ্টিভঙ্গি জানতে চাই।",
    mcStatements: "মতামত", mcMinutes: "মিনিট", mcAnon: "গোপনীয়",
    modeLabel: "আপনি কীভাবে সাজাতে চান তা বেছে নিন:",
    modeGuidedTitle: "নির্দেশিত কিউ-সর্ট", modeGuidedDesc: "ধ্রুপদী পদ্ধতি — কার্ডগুলো নির্দিষ্ট পিরামিডে রাখুন। সবচেয়ে নির্ভুল।",
    modeRec: "প্রস্তাবিত",
    modeFlexTitle: "নমনীয় মূল্যায়ন", modeFlexDesc: "প্রতিটি মতামত −৫ থেকে +৫ এর মধ্যে স্বাধীনভাবে মূল্যায়ন করুন। দ্রুত, কম শর্ত।",
    consentText: "আমার বয়স ১৮+ এবং আমি স্বেচ্ছায় অংশ নিতে রাজি। আমার গোপন উত্তরগুলো একাডেমিক গবেষণা ও প্রকাশনায় ব্যবহৃত হতে পারে।",
    resumeText: "একটি সংরক্ষিত সেশন পাওয়া গেছে।", resumeBtn: "চালিয়ে যান", freshBtn: "নতুন করে শুরু",
    beginBtn: "গবেষণা শুরু করুন →",
    demoEyebrow: "আপনার সম্পর্কে কিছু", demoTitle: "আপনার প্রসঙ্গ",
    demoSub: "এগুলো বিভিন্ন পদ ও খাতের মধ্যে মতামত তুলনা করতে সাহায্য করে। কোনো নাম বা যোগাযোগের তথ্য নয়।",
    back: "← পেছনে", continue: "এগিয়ে যান →",
    howEyebrow: "যেভাবে কাজ করে", howStep1Title: "তিন ভাগে সাজান",
    howStep1Desc: "প্রতিটি কার্ড দেখে দ্রুত <em>একমত</em>, <em>নিরপেক্ষ</em>, বা <em>দ্বিমত</em> ভাগে রাখুন।",
    howStep2Title: "পিরামিড তৈরি করুন",
    howStep2Desc: "প্রতিটি কার্ড −৫ (তীব্র দ্বিমত) থেকে +৫ (তীব্র একমত) গ্রিডে রাখুন। প্রতিটি কলামে নির্দিষ্ট সংখ্যক কার্ড থাকে।",
    howStep2FlexTitle: "প্রতিটি মতামত মূল্যায়ন করুন", howStep2FlexDesc: "প্রতিটি মতামতকে −৫ থেকে +৫ স্কোর দিন। একই স্কোর কতবার দেওয়া যাবে তার সীমা নেই।",
    howStep3Title: "কারণ বলুন", howStep3Desc: "আপনার সবচেয়ে শক্ত পছন্দ নিয়ে কয়েকটি সংক্ষিপ্ত প্রশ্ন, ব্যস।",
    legendDisagree: "তীব্র দ্বিমত", legendAgree: "তীব্র একমত", startSorting: "সাজানো শুরু করুন →",
    coarseTitle: "প্রথম অনুভূতি", coarseSub1: "কার্ড", coarseSub2: "/ ৪০ — এটি কোথায় যাবে?",
    bucketDisagree: "দ্বিমত", bucketNeutral: "নিরপেক্ষ", bucketAgree: "একমত", undo: "↶ আগেরটি ফেরান",
    fineTitle: "আপনার ক্রম তৈরি করুন", fineRemaining: "টি কার্ড রাখা বাকি",
    trayTitle: "রাখার জন্য কার্ড", tfAll: "সব", tfAgr: "একমত", tfNeu: "নিরপেক্ষ", tfDis: "দ্বিমত",
    flexTitle: "প্রতিটি মতামত মূল্যায়ন করুন", flexRated: "মূল্যায়িত",
    reflectEyebrow: "প্রায় শেষ", reflectTitle: "নিজের ভাষায়",
    reflectTopLabel: "এগুলোর সাথে আপনি সবচেয়ে বেশি একমত। কেন?",
    reflectBottomLabel: "এগুলোর সাথে আপনি সবচেয়ে বেশি দ্বিমত। কেন?",
    reflectExtraLabel: "আপনার কর্মক্ষেত্রের সভা নিয়ে আর কিছু? (ঐচ্ছিক)",
    submit: "আমার উত্তর জমা দিন →", submitting: "পাঠানো হচ্ছে…",
    doneTitle: "ধন্যবাদ", doneMsg: "আপনার দৃষ্টিভঙ্গি লিপিবদ্ধ হয়েছে। এটি বাংলাদেশ-নির্দিষ্ট মিটিং এক্সিলেন্স ফ্রেমওয়ার্ক গঠনে সাহায্য করবে।",
    download: "আমার উত্তর ডাউনলোড করুন",
    errTitle: "পাঠানো যায়নি", errMsg: "আপনার উত্তর পাঠাতে সমস্যা হয়েছে। উত্তরগুলো এই ডিভাইসে সংরক্ষিত আছে — সংযোগ দেখে আবার চেষ্টা করুন।",
    retry: "আবার চেষ্টা করুন",
    placeholderWhy: "ঐচ্ছিক — এক-দুই বাক্য…",
    fillAll: "এগিয়ে যেতে প্রতিটি প্রশ্নের উত্তর দিন।",
    sortRest: "এগিয়ে যেতে সব কার্ড রাখুন।",
    rateRest: "এগিয়ে যেতে সব মতামত মূল্যায়ন করুন।"
  }
};
