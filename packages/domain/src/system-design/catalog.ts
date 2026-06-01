import {
  systemDesignCatalogSchema,
  systemDesignTrackMetadataSchema,
  type SystemDesignCatalog,
  type SystemDesignItem,
  type SystemDesignTrackMetadata,
} from "@careeright/domain/system-design/schema";

const BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID = "PLCRMIe5FDPsd0gVs500xeOewfySTsmEjf";
const BYTEBYTEGO_INTERVIEW_PLAYLIST_ID = "PLCRMIe5FDPseVvwzRiCQBmNOVUIZSSkP8";
const HUSSEIN_NETWORKING_PLAYLIST_ID = "PLQnljOFTspQUBSgBXilKhRMJ1ACqr7pTr";
const HELLO_INTERVIEW_PLAYLIST_ID = "PL5q3E8eRUieWtYLmRU3z94-vGRcwKr9tM";
const HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID =
  "PL5q3E8eRUieUHnsz0rh0W6AzwdVJBwEK6";
const GAURAV_SEN_PLAYLIST_ID = "PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX";
const CONCEPT_CODING_LLD_PLAYLIST_ID = "PL6W8uoQQ2c61X_9e6Net0WdYZidm7zooW";
const CODER_ARMY_PLAYLIST_ID = "PLQEaRBV9gAFvzp6XhcNFpk1WdOcyVo9qT";

type LessonInput = {
  slug: string;
  title: string;
  videoId: string;
  playlistId: string;
  playlistTitle: string;
  sourceName: string;
  description?: string;
};

type DrillInput = {
  slug: string;
  title: string;
  description: string;
};

type ModuleInput = {
  id: string;
  title: string;
  description: string;
  items: Array<LessonInput | DrillInput>;
};

type TrackInput = {
  id: string;
  title: string;
  description: string;
  modules: ModuleInput[];
};

function playlistUrl(playlistId: string) {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}

function videoUrl(videoId: string, playlistId: string) {
  return `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;
}

function lesson(input: LessonInput): LessonInput {
  return input;
}

function drill(input: DrillInput): DrillInput {
  return input;
}

function isLesson(item: LessonInput | DrillInput): item is LessonInput {
  return "videoId" in item;
}

const tracks = [
  {
    id: "foundations",
    title: "Foundations",
    description:
      "Core vocabulary for system design interviews: estimates, networking, APIs, scaling, storage, and distributed system tradeoffs.",
    modules: [
      {
        id: "start-here",
        title: "Start Here",
        description:
          "Learn the interview flow and the first principles that make later designs easier to reason about.",
        items: [
          lesson({
            slug: "introduction-to-system-design",
            title: "Introduction To System Design",
            videoId: "AK0hu0Zxua4",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "system-design-interview-step-by-step-guide",
            title: "System Design Interview Step-By-Step Guide",
            videoId: "i7twT3x5yv8",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "back-of-the-envelope-estimation",
            title: "Back-Of-The-Envelope Estimation",
            videoId: "UC5xf8FbdJc",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "system-design-primer",
            title: "System Design Primer",
            videoId: "SqcXvc3ZmRU",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "five-tips-for-system-design-interviews",
            title: "5 Tips for System Design Interviews",
            videoId: "CtmBGH8MkX4",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          drill({
            slug: "capacity-estimate-drill",
            title: "Capacity Estimate Drill",
            description:
              "Pick a product, estimate daily active users, requests per second, storage per day, and peak traffic. Record assumptions before calculating.",
          }),
        ],
      },
      {
        id: "web-apis-networking",
        title: "Web, APIs, Networking",
        description:
          "Build the request-path mental model from browser to API edge to service boundary.",
        items: [
          lesson({
            slug: "how-the-internet-works",
            title: "How the Internet Works",
            videoId: "sMHzfigUxz4",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "tcp-vs-udp",
            title: "TCP vs UDP Crash Course",
            videoId: "qqRYkcta6IE",
            playlistId: HUSSEIN_NETWORKING_PLAYLIST_ID,
            playlistTitle: "Network Engineering",
            sourceName: "Hussein Nasser",
          }),
          lesson({
            slug: "url-in-browser",
            title: "What Happens When You Type a URL Into Your Browser",
            videoId: "AlkDbnbv7dk",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "dns",
            title: "Everything You Need to Know About DNS",
            videoId: "27r4Bzuj5NQ",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "http-1-http-2-http-3",
            title: "HTTP/1 to HTTP/2 to HTTP/3",
            videoId: "a-sBfyiXysI",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "ssl-tls-https",
            title: "SSL, TLS, HTTPS Explained",
            videoId: "j9QmMEWmcfo",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "rest-api",
            title: "REST API",
            videoId: "-mN3VyJuCjM",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "rpc-and-grpc",
            title: "RPC and gRPC",
            videoId: "gnchfOojMk4",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "api-gateway",
            title: "API Gateway",
            videoId: "6ULyxuHKxg8",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          drill({
            slug: "api-contract-drill",
            title: "API Contract Drill",
            description:
              "Write the core REST or RPC endpoints for a URL shortener, including request shape, response shape, errors, and idempotency notes.",
          }),
        ],
      },
      {
        id: "scaling-and-edge",
        title: "Scaling and Edge",
        description:
          "Understand traffic distribution, edge caching, and availability decisions.",
        items: [
          lesson({
            slug: "horizontal-vs-vertical-scaling",
            title: "Horizontal vs Vertical Scaling",
            videoId: "xpDnVSmNFX0",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "load-balancing",
            title: "Load Balancing",
            videoId: "K0Ta65OqQkY",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "load-balancing-algorithms",
            title: "Load Balancing Algorithms",
            videoId: "dBmxNsS3BGE",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "reverse-proxy-api-gateway-load-balancer",
            title: "Reverse Proxy vs API Gateway vs Load Balancer",
            videoId: "RqfaTIWc3LQ",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "cdn",
            title: "Content Delivery Network",
            videoId: "RI9np1LWzqw",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "single-point-of-failure",
            title: "Avoiding a Single Point of Failure",
            videoId: "-BOysyYErLY",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "fault-tolerant-systems",
            title: "Fault-Tolerant Systems",
            videoId: "3Lis4w4_bBc",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          drill({
            slug: "scaling-bottleneck-review",
            title: "Scaling Bottleneck Review",
            description:
              "For one design, identify the first bottleneck at 10x, 100x, and 1000x traffic. Add the smallest architecture change for each stage.",
          }),
        ],
      },
      {
        id: "data-and-storage",
        title: "Data and Storage",
        description:
          "Choose storage systems using access pattern, consistency, scale, and operational tradeoffs.",
        items: [
          lesson({
            slug: "memory-and-storage-systems",
            title: "Memory and Storage Systems",
            videoId: "lX4CrbXMsNQ",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "key-value-stores",
            title: "Key Value Stores",
            videoId: "Dwt8R0KPu7k",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "acid",
            title: "ACID Properties",
            videoId: "GAe5oB742dw",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "cap",
            title: "CAP Theorem",
            videoId: "BHqjEjzAicA",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "nosql",
            title: "NoSQL Databases",
            videoId: "xQnIN9bW0og",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "database-sharding",
            title: "Database Sharding",
            videoId: "5faMjKuB9bc",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "caching-in-distributed-systems",
            title: "Caching in Distributed Systems",
            videoId: "zw7VwIlkPPc",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "caching-pitfalls",
            title: "Caching Pitfalls",
            videoId: "wh98s0XhMmQ",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          drill({
            slug: "data-model-drill",
            title: "Data Model Drill",
            description:
              "Model entities, indexes, partition key, retention, and read/write paths for a chat system or food delivery app.",
          }),
        ],
      },
      {
        id: "distributed-patterns",
        title: "Distributed Patterns",
        description:
          "Learn the algorithms and async patterns that appear repeatedly in scalable services.",
        items: [
          lesson({
            slug: "consistent-hashing",
            title: "Consistent Hashing",
            videoId: "UF9Iqmg94tk",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "bloom-filters",
            title: "Bloom Filters",
            videoId: "V3pzxngeLqw",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "message-queue",
            title: "Message Queue",
            videoId: "oUJbuFMyBDk",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "pub-sub",
            title: "Publisher Subscriber Model",
            videoId: "FMhbR_kQeHw",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "event-driven-systems",
            title: "Event Driven Systems",
            videoId: "rJHTK2TfZ1I",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "kafka-fundamentals",
            title: "Kafka Fundamentals",
            videoId: "-RDyEFvnTXI",
            playlistId: BYTEBYTEGO_FUNDAMENTALS_PLAYLIST_ID,
            playlistTitle: "System Design Fundamentals",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "distributed-consensus-replication",
            title: "Distributed Consensus and Replication",
            videoId: "GeGxgmPTe4c",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "data-consistency-tradeoffs",
            title: "Data Consistency Tradeoffs",
            videoId: "m4q7VkgDWrM",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
        ],
      },
    ],
  },
  {
    id: "hld-core",
    title: "HLD Core",
    description:
      "Practice high-level architecture with interview-style product designs and deeper walkthroughs.",
    modules: [
      {
        id: "hld-interview-designs",
        title: "Interview Designs",
        description:
          "Cover the classic product prompts that test requirements, APIs, storage, scaling, and tradeoffs.",
        items: [
          lesson({
            slug: "url-shortener",
            title: "Design a URL Shortener",
            videoId: "HHUi8F_qAXM",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "rate-limiter",
            title: "Design a Rate Limiter",
            videoId: "YXkOdWBwqaA",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "chat-system",
            title: "Design a Chat System",
            videoId: "okrR1KXNLtA",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "youtube",
            title: "Design YouTube",
            videoId: "jWRW2xGMqSw",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "web-crawler",
            title: "Design a Web Crawler",
            videoId: "6u25GckPhLU",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "location-based-service",
            title: "Design a Location Based Service",
            videoId: "M4lR_Va97cQ",
            playlistId: BYTEBYTEGO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Interview",
            sourceName: "ByteByteGo",
          }),
          lesson({
            slug: "instagram-news-feed",
            title: "Design Instagram News Feed",
            videoId: "QmX2NPkJTKg",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          lesson({
            slug: "whatsapp",
            title: "Design WhatsApp",
            videoId: "vvhC64hQZMk",
            playlistId: GAURAV_SEN_PLAYLIST_ID,
            playlistTitle: "System Design Playlist",
            sourceName: "Gaurav Sen",
          }),
          drill({
            slug: "hld-diagram-drill",
            title: "HLD Diagram Drill",
            description:
              "Draw one end-to-end design with clients, edge, services, queues, databases, caches, and observability. Add arrows for read and write paths.",
          }),
        ],
      },
      {
        id: "hld-component-deep-dives",
        title: "Component Deep Dives",
        description:
          "Strengthen core HLD choices by studying the infrastructure pieces that commonly decide the final design.",
        items: [
          lesson({
            slug: "networking-essentials-system-design-interviews",
            title: "Networking Essentials for System Design Interviews",
            videoId: "SHkbPm1Wrno",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "api-gateways-system-design-interviews",
            title: "API Gateways in System Design Interviews",
            videoId: "7-6F3b14baA",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "redis-deep-dive",
            title: "Redis Deep Dive",
            videoId: "fmT5nlEkl3U",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "db-indexing-system-design-interviews",
            title: "DB Indexing in System Design Interviews",
            videoId: "BHCSL_ZifI0",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "dynamodb-deep-dive",
            title: "DynamoDB Deep Dive",
            videoId: "2X2SO3Y-af8",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "cassandra-deep-dive",
            title: "Cassandra Deep Dive",
            videoId: "TD3-INhm60Q",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "elasticsearch-deep-dive",
            title: "Elasticsearch Deep Dive",
            videoId: "PuZvF2EyfBM",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "time-series-databases",
            title: "Time Series Databases",
            videoId: "Qd76ZmfRs_Q",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "kafka-system-design-deep-dive",
            title: "Kafka System Design Deep Dive",
            videoId: "DU8o-OTeoCc",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "distributed-transactions-two-phase-commit-saga",
            title: "Distributed Transactions: 2 Phase Commit vs Saga Pattern",
            videoId: "DOFflggE_0Q",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "big-data-data-structures",
            title:
              "Data Structures for Big Data: Bloom Filters, Count-Min Sketch, HyperLogLog",
            videoId: "IgyU0iFIoqM",
            playlistId: HELLO_INTERVIEW_DEEP_DIVES_PLAYLIST_ID,
            playlistTitle: "Deep Dives",
            sourceName: "Hello Interview",
          }),
        ],
      },
      {
        id: "hld-deep-walkthroughs",
        title: "Deep Walkthroughs",
        description:
          "Use longer sessions to see how senior interviewers pressure-test tradeoffs and bottlenecks.",
        items: [
          lesson({
            slug: "ticketmaster",
            title: "Design Ticketmaster",
            videoId: "fhdPyoO6aXI",
            playlistId: HELLO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Walkthroughs",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "uber",
            title: "Design Uber",
            videoId: "lsKU38RKQSo",
            playlistId: HELLO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Walkthroughs",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "dropbox-google-drive",
            title: "Design Dropbox or Google Drive",
            videoId: "_UZ1ngy-kOI",
            playlistId: HELLO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Walkthroughs",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "bitly",
            title: "Design Bitly",
            videoId: "iUU4O1sWtJA",
            playlistId: HELLO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Walkthroughs",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "ad-click-aggregator",
            title: "Design an Ad Click Aggregator",
            videoId: "Zcv_899yqhI",
            playlistId: HELLO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Walkthroughs",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "leetcode-online-judge",
            title: "Design LeetCode Online Judge",
            videoId: "1xHADtekTNg",
            playlistId: HELLO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Walkthroughs",
            sourceName: "Hello Interview",
          }),
          lesson({
            slug: "top-k",
            title: "Top-K System Design",
            videoId: "y-tA2NW4LNY",
            playlistId: HELLO_INTERVIEW_PLAYLIST_ID,
            playlistTitle: "System Design Walkthroughs",
            sourceName: "Hello Interview",
          }),
          drill({
            slug: "sequence-diagram-drill",
            title: "Sequence Diagram Drill",
            description:
              "For one HLD prompt, write the exact sequence of calls for the critical user action, including retries and async steps.",
          }),
        ],
      },
    ],
  },
  {
    id: "lld-core",
    title: "LLD Core",
    description:
      "Move from object modeling to design patterns and interview-ready low-level case studies.",
    modules: [
      {
        id: "lld-oop-and-modeling",
        title: "OOP and Modeling",
        description:
          "Set up the vocabulary for class diagrams, responsibilities, boundaries, and code-level extensibility.",
        items: [
          lesson({
            slug: "what-is-lld",
            title: "What is LLD",
            videoId: "mQM3V8E13yc",
            playlistId: CONCEPT_CODING_LLD_PLAYLIST_ID,
            playlistTitle: "Low Level Design from Basics to Advanced",
            sourceName: "Concept and Coding",
          }),
          lesson({
            slug: "oops-real-world-examples",
            title: "OOPs Real-World Examples",
            videoId: "QbGoqAgP_zg",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "uml-class-sequence-diagrams",
            title: "UML Class and Sequence Diagrams",
            videoId: "nPJyyO9pb5s",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "solid-design-principles",
            title: "SOLID Design Principles",
            videoId: "UsNl8kcU4UA",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          drill({
            slug: "uml-class-diagram-drill",
            title: "UML Class Diagram Drill",
            description:
              "Model classes, interfaces, relationships, and cardinality for Parking Lot or Splitwise before writing code.",
          }),
        ],
      },
      {
        id: "lld-design-patterns",
        title: "Design Patterns",
        description:
          "Learn the patterns that most often convert changing requirements into small code changes.",
        items: [
          lesson({
            slug: "strategy",
            title: "Strategy Design Pattern",
            videoId: "PpKvPrl_gRg",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "observer",
            title: "Observer Design Pattern",
            videoId: "Jpmp4GY8r3Q",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "decorator",
            title: "Decorator Design Pattern",
            videoId: "Z9rFlZClYNI",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "factory-abstract-factory",
            title: "Factory Method and Abstract Factory",
            videoId: "dMK4TbG29fk",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "adapter",
            title: "Adapter Design Pattern",
            videoId: "FV3x69rpwm0",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "command",
            title: "Command Design Pattern",
            videoId: "cnQZsN0jxEY",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "composite",
            title: "Composite Design Pattern",
            videoId: "xaaiMGmyDJk",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "builder",
            title: "Builder Design Pattern",
            videoId: "G4Ntl9KzIxY",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "state",
            title: "State Design Pattern",
            videoId: "bJPmvie_p4w",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
        ],
      },
      {
        id: "lld-case-studies",
        title: "Case Studies",
        description:
          "Practice translating requirements into objects, flows, extensibility points, and edge cases.",
        items: [
          lesson({
            slug: "parking-lot",
            title: "Design Parking Lot",
            videoId: "MtjZf7291zc",
            playlistId: CONCEPT_CODING_LLD_PLAYLIST_ID,
            playlistTitle: "Low Level Design from Basics to Advanced",
            sourceName: "Concept and Coding",
          }),
          lesson({
            slug: "tic-tac-toe",
            title: "Design Tic Tac Toe",
            videoId: "BGFzYjGtRP4",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "elevator",
            title: "Design Elevator System",
            videoId: "9ORcPv_Tbz8",
            playlistId: CONCEPT_CODING_LLD_PLAYLIST_ID,
            playlistTitle: "Low Level Design from Basics to Advanced",
            sourceName: "Concept and Coding",
          }),
          lesson({
            slug: "bookmyshow",
            title: "Design BookMyShow",
            videoId: "wCyzvDn3Pp8",
            playlistId: CONCEPT_CODING_LLD_PLAYLIST_ID,
            playlistTitle: "Low Level Design from Basics to Advanced",
            sourceName: "Concept and Coding",
          }),
          lesson({
            slug: "vending-machine",
            title: "Design Vending Machine",
            videoId: "wOXs5Z_z0Ew",
            playlistId: CONCEPT_CODING_LLD_PLAYLIST_ID,
            playlistTitle: "Low Level Design from Basics to Advanced",
            sourceName: "Concept and Coding",
          }),
          lesson({
            slug: "atm",
            title: "Design ATM",
            videoId: "JH7gcXeR3ds",
            playlistId: CONCEPT_CODING_LLD_PLAYLIST_ID,
            playlistTitle: "Low Level Design from Basics to Advanced",
            sourceName: "Concept and Coding",
          }),
          lesson({
            slug: "splitwise",
            title: "Design Splitwise",
            videoId: "cWtBZUAQpcc",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "chess",
            title: "Design Chess",
            videoId: "eULHvaMZUks",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "payment-gateway",
            title: "Design Payment Gateway",
            videoId: "36FDqIRBGRg",
            playlistId: CODER_ARMY_PLAYLIST_ID,
            playlistTitle: "System Design Full Course",
            sourceName: "Coder Army",
          }),
          lesson({
            slug: "meeting-scheduler",
            title: "Meeting Scheduler Mock Interview",
            videoId: "MRx40JVmmF4",
            playlistId: CONCEPT_CODING_LLD_PLAYLIST_ID,
            playlistTitle: "Low Level Design from Basics to Advanced",
            sourceName: "Concept and Coding",
          }),
          drill({
            slug: "concurrency-edge-case-review",
            title: "Concurrency and Edge-Case Review",
            description:
              "For BookMyShow, ATM, or Payment Gateway, list race conditions, locks or transactions, idempotency keys, failure modes, and retries.",
          }),
        ],
      },
    ],
  },
] as const satisfies readonly TrackInput[];

function buildStaticCatalog() {
  let lessonCount = 0;

  return systemDesignCatalogSchema.parse({
    tracks: tracks.map((track) => ({
      id: track.id,
      title: track.title,
      description: track.description,
      modules: track.modules.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        items: module.items.map((item, itemIndex) => {
          const baseItem = {
            id: `${module.id}-${item.slug}`,
            trackId: track.id,
            moduleId: module.id,
            order: itemIndex * 100,
            title: item.title,
            description: item.description ?? "",
          };

          if (!isLesson(item)) {
            return {
              ...baseItem,
              sourceType: "drill",
              lessonLabel: "DRILL",
            };
          }

          lessonCount += 1;

          return {
            ...baseItem,
            sourceType: "lesson",
            lessonNumber: lessonCount,
            lessonLabel: `SD${lessonCount}`,
            sourceName: item.sourceName,
            playlistTitle: item.playlistTitle,
            playlistUrl: playlistUrl(item.playlistId),
            videoId: item.videoId,
            videoUrl: videoUrl(item.videoId, item.playlistId),
          };
        }),
      })),
    })),
  });
}

export const SYSTEM_DESIGN_CATALOG: SystemDesignCatalog = buildStaticCatalog();

export const SYSTEM_DESIGN_ITEMS = SYSTEM_DESIGN_CATALOG.tracks.flatMap(
  (track) => track.modules.flatMap((module) => module.items),
);

export const SYSTEM_DESIGN_ITEM_IDS = new Set(
  SYSTEM_DESIGN_ITEMS.map((item) => item.id),
);

export const STATIC_SYSTEM_DESIGN_TRACKS: SystemDesignTrackMetadata[] =
  SYSTEM_DESIGN_CATALOG.tracks.map((track, trackIndex) =>
    systemDesignTrackMetadataSchema.parse({
      id: track.id,
      title: track.title,
      description: track.description,
      order: trackIndex * 100,
      modules: track.modules.map((module, moduleIndex) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        order: moduleIndex * 100,
      })),
    }),
  );

export function systemDesignCatalogItemIds(catalog: SystemDesignCatalog) {
  return new Set(
    catalog.tracks.flatMap((track) =>
      track.modules.flatMap((module) => module.items.map((item) => item.id)),
    ),
  );
}

export function systemDesignCatalogItemOrder(catalog: SystemDesignCatalog) {
  return new Map(
    catalog.tracks
      .flatMap((track) =>
        track.modules.flatMap((module) => module.items.map((item) => item.id)),
      )
      .map((itemId, index) => [itemId, index]),
  );
}

function systemDesignCatalogBucketKey(trackId: string, moduleId: string) {
  return `${trackId}\u0000${moduleId}`;
}

function sortSystemDesignItems(items: SystemDesignItem[]) {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.title.localeCompare(b.title);
  });
}

export function buildSystemDesignCatalogFromTrackMetadata(
  trackMetadata: SystemDesignTrackMetadata[],
  items: SystemDesignItem[],
) {
  const itemsByModule = new Map<string, SystemDesignItem[]>();

  for (const item of items) {
    const key = systemDesignCatalogBucketKey(item.trackId, item.moduleId);
    const currentItems = itemsByModule.get(key) ?? [];
    itemsByModule.set(key, [...currentItems, item]);
  }

  return systemDesignCatalogSchema.parse({
    tracks: [...trackMetadata]
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
      .map((track) => ({
        id: track.id,
        title: track.title,
        description: track.description,
        modules: [...track.modules]
          .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
          .map((module) => ({
            id: module.id,
            title: module.title,
            description: module.description,
            items: sortSystemDesignItems(
              itemsByModule.get(
                systemDesignCatalogBucketKey(track.id, module.id),
              ) ?? [],
            ),
          })),
      })),
  });
}
