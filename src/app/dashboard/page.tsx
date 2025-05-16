export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Hoş Geldiniz!</h2>
        <p className="text-gray-600">
          CRM sistemine hoş geldiniz. Sol menüden istediğiniz bölüme erişebilirsiniz.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Hızlı İstatistikler</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Toplam Müşteri</span>
            <span className="font-bold">0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Bugünkü Randevular</span>
            <span className="font-bold">0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Aktif Takımlar</span>
            <span className="font-bold">0</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Son Aktiviteler</h2>
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Henüz aktivite bulunmuyor.
          </p>
        </div>
      </div>
    </div>
  );
}
