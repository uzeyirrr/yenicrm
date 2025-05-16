# CRM Uygulaması

Bu proje, müşteri ilişkileri yönetimi için geliştirilmiş bir web uygulamasıdır. [Next.js](https://nextjs.org) kullanılarak oluşturulmuştur.

## Özellikler

- Müşteri yönetimi ve düzenleme
- Kullanıcı yönetimi
- Takım yönetimi
- Randevu kategorileri
- Randevu slotları
- QC (Kalite Kontrol) takibi
- Lider tablosu
- Profil sayfası
- Başarı oranı grafikleri
- Modern ve kullanıcı dostu arayüz

## Kurulum

### Gereksinimleri

- Node.js 18.0.0 veya daha yüksek
- npm veya yarn
- PocketBase sunucusu (Backend için)

### Projeyi İndirme

```bash
git clone https://github.com/uzeyirrr/yenicrm.git
cd yenicrm
```

### Bağımlılıkları Yükleme

```bash
npm install
# veya
yarn install
```

### Geliştirme Sunucusunu Başlatma

```bash
npm run dev
# veya
yarn dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açarak uygulamayı görebilirsiniz.

## Backend Kurulumu

Bu uygulama backend olarak PocketBase kullanmaktadır. PocketBase sunucusunu kurmak için:

1. [PocketBase](https://pocketbase.io/docs/) web sitesinden PocketBase'i indirin
2. İndirdiğiniz dosyayı çıkarın ve çalıştırın
3. PocketBase admin paneline erişin ve gerekli koleksiyonları oluşturun
4. `src/lib/pocketbase.ts` dosyasındaki API URL'sini kendi PocketBase sunucunuzun URL'si ile güncelleyin

## Dağıtım

Bu Next.js uygulamasını dağıtmak için en kolay yol [Vercel Platform](https://vercel.com/new)'u kullanmaktır.

## Katkıda Bulunma

1. Bu depoyu fork edin
2. Kendi branch'inizi oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inize push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## İletişim

Uzeyir Ismail Bahtiyar - uzeyirismailbahtiyar@gmail.com

Proje Linki: [https://github.com/uzeyirrr/yenicrm](https://github.com/uzeyirrr/yenicrm)
