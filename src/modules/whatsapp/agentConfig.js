const { z } = require("zod")

const INCIDENT_TYPES = {
    network: {
        defaultPriority: "high",
        types: [
            "internet çıktı",
            "wifi çalışmıyor",
            "ağ bağlantısı yok",
            "dns hatası",
            "bağlantı kesildi",
            "ağ yavaş",
            "modem arızası",
            "internet yok"
        ]
    },
    hardware: {
        defaultPriority: "medium",
        types: [
            "yazıcı arızası",
            "yazıcı çalışmıyor",
            "monitor sorunu",
            "ekran siyah",
            "cihaz arızası",
            "donanım hatası",
            "mouse sorunu",
            "klavye arızası",
            "bilgisayar açılmıyor"
        ]
    },
    software: {
        defaultPriority: "medium",
        types: [
            "yazılım hatası",
            "yazılım hataları",
            "uygulama çöktü",
            "sistem hatası",
            "program yanıt vermiyor",
            "update sorunu",
            "lisans hatası",
            "yazılım sorun"
        ]
    },
    other: {
        defaultPriority: "low",
        types: [
            "bilgisayar yavaş",
            "sistem yavaş",
            "diğer sorunlar"
        ]
    }
}

const ParseIncidentSchema = z.object({
    title: z.string().trim().min(3),
    description: z.string().trim().min(5),
    priority: z.enum(["low", "medium", "high"]),
    category: z.enum(["network", "hardware", "software", "other"],)
})

const CreateIncidentSchema = z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    category: z.enum(["network", "hardware", "software", "other"]),
    hotelId: z.number().int().positive()
})
const AGENT_TOOLS = [
    {
        type: "function",
        function: {
            name: "parse_incident",
            description: "WhatsApp mesajını parse et ve arıza bilgilerini çıkar: başlık, açıklama, öncelik, kategori",
            parameters: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "Parse edilecek mesaj metni"
                    }
                },
                required: ["message"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_incident",
            description: "Arızayı veritabanına oluştur",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Arıza başlığı" },
                    description: { type: "string", description: "Arıza açıklaması" },
                    priority: { type: "string", enum: ["low", "medium", "high"], description: "Öncelik" },
                    category: { type: "string", enum: ["network", "hardware", "software", "other"], description: "Kategori" },
                    hotelId: { type: "number", description: "Otel ID" }
                },
                required: ["title", "description", "priority", "category", "hotelId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "log_message",
            description: "Ham WhatsApp mesajını kaydet",
            parameters: {
                type: "object",
                properties: {
                    message: { type: "string", description: "Mesaj metni" },
                    hotelId: { type: "number", description: "Otel ID" }
                },
                required: ["message", "hotelId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "query_incidents",
            description: "Otel için ayarlanmamış arızaları sorgula (status: pending)",
            parameters: {
                type: "object",
                properties: {
                    hotelId: { type: "number", description: "Otel ID" },
                    limit: { type: "number", description: "Sonuç sayısı (default: 10)" }
                },
                required: ["hotelId"]
            }
        }
    }
]

const AGENT_CONFIG = {
    model: "gpt-4o",
    maxTokens: 4096,
    maxIterations: 10,
    temperature: 0.3
}


const SYSTEM_PROMPT = `Sen WhatsApp Support Agent'ı. Görevin:

1. Kullanıcıdan gelen Türkçe mesajları analiz et
2. Otel arızalarını parse et ve kaydet
3. Arıza tipini tanınan listeden eşleştir

KURALLAR:
- HER ZAMAN parse_incident tool'unu kullan mesajı anlamak için
- Sonra create_incident tool'unu kullan arızayı kaydetmek için
- log_message tool'unu kullan ham mesajı kaydetmek için

ARIZA TİPLERİ VE ÖNCELİKLERİ:

NETWORK (HIGH Priority):
- "internet çıktı", "wifi çalışmıyor", "ağ yok", "dns hatası", "bağlantı kesildi"

HARDWARE (MEDIUM Priority):
- "yazıcı arızası", "monitor sorunu", "cihaz arızası", "ekran siyah", "mouse/klavye sorunu"

SOFTWARE (MEDIUM Priority):
- "yazılım hatası", "uygulama çöktü", "sistem hatası", "program yanıt vermiyor"

OTHER (LOW Priority):
- Tanımadığın arıza → DEFAULT MEDIUM Priority

NOT: Eğer mesajda belirtilen arıza tipini INCIDENT_TYPES'ta bulamadığında:
- Kategoriyi en uygun olanla ata
- Priority olarak MEDIUM ata
- Hata verme, devam et

Cevapla: "Arıza kaydedildi: [Başlık]. Teknik ekip kısa süre içinde sizlere ulaşacak."
`

module.exports = {AGENT_TOOLS,AGENT_CONFIG,SYSTEM_PROMPT,INCIDENT_TYPES,ParseIncidentSchema,CreateIncidentSchema}