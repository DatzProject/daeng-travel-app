import React, { useState, useEffect } from "react";
import {
  Plus,
  Save,
  Trash2,
  User,
  Calendar,
  FileText,
  MapPin,
  Package,
  DollarSign,
  Clock,
  Image,
  Edit,
} from "lucide-react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type FormData = {
  nama: string;
  tanggal_daftar: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  nomor_passport: string;
  masa_berlaku_passport: string;
  jenis_trip: string;
  paket_tour: string;
  durasi_tour: string;
  harga_paket: string;
  tanggal_keberangkatan: string;
};

interface TravelData extends FormData {
  id: string; // Ubah ke string karena nomor_passport adalah string
  timestamp: string;
  foto_passport?: string; // Optional
}

const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzy6sniNnfgQ5i_iCm0m24DF8kD6d-Kjos0d9c4_aHpV_F_WIIiXgXuEbw4GyXpyVfbvQ/exec"; // Ganti dengan URL Web App dari Google Apps Script Anda

const TravelFormApp = () => {
  const [formData, setFormData] = useState<FormData>({
    nama: "",
    tanggal_daftar: "",
    tanggal_lahir: "",
    jenis_kelamin: "",
    nomor_passport: "",
    masa_berlaku_passport: "",
    jenis_trip: "",
    paket_tour: "",
    durasi_tour: "",
    harga_paket: "",
    tanggal_keberangkatan: "",
  });
  const [fotoPassportBase64, setFotoPassportBase64] = useState<string | null>(
    null
  );
  const [dataList, setDataList] = useState<TravelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${ENDPOINT}?action=read&sheet=TravelData`,
          {
            // Asumsikan sheet default adalah TravelData; sesuaikan jika berbeda
            mode: "cors",
          }
        );
        if (!response.ok) {
          throw new Error("Gagal memuat data");
        }
        const data = await response.json();
        setDataList(
          data.map((item: TravelData, index: number) => ({
            ...item,
            id:
              item.id || item.nomor_passport || (Date.now() + index).toString(),
          }))
        );
      } catch (error) {
        setMessage("Terjadi kesalahan saat memuat data");
        setTimeout(() => setMessage(""), 3000);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "harga_paket") {
      const rawValue = value.replace(/\./g, "").replace(/\D/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: rawValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFotoPassportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setFotoPassportBase64(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatInputNumber = (value: string) => {
    if (!value) return "";
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const validateForm = () => {
    return (
      formData.nama &&
      formData.tanggal_daftar &&
      formData.tanggal_lahir &&
      formData.jenis_kelamin &&
      formData.nomor_passport &&
      formData.masa_berlaku_passport &&
      formData.jenis_trip &&
      formData.paket_tour &&
      formData.durasi_tour &&
      formData.harga_paket
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setMessage("Harap isi semua field yang diperlukan");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setIsLoading(true);
    try {
      const dataToSend = {
        ...formData,
        timestamp: new Date().toLocaleString("id-ID"),
        foto_passport: fotoPassportBase64
          ? fotoPassportBase64.split(",")[1]
          : null, // Kirim base64 tanpa prefix
        sheet: "TravelData", // Asumsikan sheet default
      };
      const response = await fetch(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(dataToSend),
        headers: {
          "Content-Type": "text/plain", // Fix CORS preflight
        },
        mode: "cors",
        redirect: "follow",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gagal menyimpan data: ${errorText}`);
      }
      const newData = await response.json(); // Asumsikan respons kembali data baru dengan id dan foto_passport
      setDataList((prev) => [
        ...prev,
        {
          id: newData.id || formData.nomor_passport,
          ...formData,
          foto_passport: newData.foto_passport || "",
          timestamp: new Date().toLocaleString("id-ID"),
        },
      ]);
      setFormData({
        nama: "",
        tanggal_daftar: "",
        tanggal_lahir: "",
        jenis_kelamin: "",
        nomor_passport: "",
        masa_berlaku_passport: "",
        jenis_trip: "",
        paket_tour: "",
        durasi_tour: "",
        harga_paket: "",
        tanggal_keberangkatan: "",
      });
      setFotoPassportBase64(null);
      setMessage("Data berhasil disimpan!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: unknown) {
      console.error(error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan data";
      setMessage(errorMessage);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${ENDPOINT}?action=delete&passport=${encodeURIComponent(
          id
        )}&sheet=TravelData`,
        {
          method: "GET",
          mode: "cors",
        }
      );
      if (!response.ok) {
        throw new Error("Gagal menghapus data");
      }
      setDataList((prev) => prev.filter((item) => item.id !== id));
      setMessage("Data berhasil dihapus!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus data";
      setMessage(errorMessage);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    if (!value) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(Number(value));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">
            Aplikasi Data Perjalanan
          </h1>
          <p className="text-gray-600 text-center">
            Kelola data perjalanan dan paket tour dengan mudah
          </p>
          <div className="mt-4 flex justify-center space-x-4">
            <Link to="/" className="text-blue-600 hover:underline">
              Form Perjalanan
            </Link>
            <Link to="/data-customer" className="text-blue-600 hover:underline">
              Data Customer
            </Link>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.includes("berhasil")
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form Input */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Plus className="mr-2" size={24} />
              Tambah Data Baru
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <User size={16} className="mr-1" />
                  Nama
                </label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" />
                  Tanggal Daftar
                </label>
                <input
                  type="date"
                  name="tanggal_daftar"
                  value={formData.tanggal_daftar}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" />
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  name="tanggal_lahir"
                  value={formData.tanggal_lahir}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Kelamin
                </label>
                <select
                  name="jenis_kelamin"
                  value={formData.jenis_kelamin}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Jenis Kelamin</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FileText size={16} className="mr-1" />
                  Nomor Passport
                </label>
                <input
                  type="text"
                  name="nomor_passport"
                  value={formData.nomor_passport}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan nomor passport"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" />
                  Masa Berlaku Passport
                </label>
                <input
                  type="date"
                  name="masa_berlaku_passport"
                  value={formData.masa_berlaku_passport}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <MapPin size={16} className="mr-1" />
                  Jenis Trip
                </label>
                <select
                  name="jenis_trip"
                  value={formData.jenis_trip}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Jenis Trip</option>
                  <option value="Domestik">Domestik</option>
                  <option value="Internasional">Internasional</option>
                  <option value="Umroh">Umroh</option>
                  <option value="Haji">Haji</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Package size={16} className="mr-1" />
                  Paket Tour
                </label>
                <select
                  name="paket_tour"
                  value={formData.paket_tour}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Paket Tour</option>
                  <option value="Malaysia - Singapore - Thailand">
                    Malaysia - Singapore - Thailand
                  </option>
                  <option value="Malaysia - Singapore">
                    Malaysia - Singapore
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Clock size={16} className="mr-1" />
                  Durasi Tour
                </label>
                <select
                  name="durasi_tour"
                  value={formData.durasi_tour}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Durasi Tour</option>
                  <option value="3D 2N">3D 2N</option>
                  <option value="4D 3N">4D 3N</option>
                  <option value="5D 4N">5D 4N</option>
                  <option value="6D 5N">6D 5N</option>
                  <option value="7D 6N">7D 6N</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <DollarSign size={16} className="mr-1" />
                  Harga Paket
                </label>
                <input
                  type="text"
                  name="harga_paket"
                  value={formatInputNumber(formData.harga_paket)}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan harga paket"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" />
                  Tanggal Keberangkatan
                </label>
                <input
                  type="date"
                  name="tanggal_keberangkatan"
                  value={formData.tanggal_keberangkatan}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Image size={16} className="mr-1" />
                  Foto Passport
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFotoPassportChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Save className="mr-2" size={20} />
                {isLoading ? "Menyimpan..." : "Simpan Data"}
              </button>
            </div>
          </div>

          {/* Data List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Data Tersimpan ({dataList.length})
            </h2>
            {dataList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>Belum ada data tersimpan</p>
                <p className="text-sm mt-2">
                  Silakan isi form untuk menambah data
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {dataList.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-gray-800">
                        {item.nama}
                      </h3>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Tanggal Daftar:</span>{" "}
                        {item.tanggal_daftar}
                      </div>
                      <div>
                        <span className="font-medium">Jenis Kelamin:</span>{" "}
                        {item.jenis_kelamin}
                      </div>
                      <div>
                        <span className="font-medium">Tanggal Lahir:</span>{" "}
                        {item.tanggal_lahir}
                      </div>
                      <div>
                        <span className="font-medium">No. Passport:</span>{" "}
                        {item.nomor_passport}
                      </div>
                      <div>
                        <span className="font-medium">Berlaku s/d:</span>{" "}
                        {item.masa_berlaku_passport}
                      </div>
                      <div>
                        <span className="font-medium">Jenis Trip:</span>{" "}
                        {item.jenis_trip}
                      </div>
                      <div>
                        <span className="font-medium">Paket:</span>{" "}
                        {item.paket_tour}
                      </div>
                      <div>
                        <span className="font-medium">Durasi:</span>{" "}
                        {item.durasi_tour}
                      </div>
                      <div>
                        <span className="font-medium">
                          Tanggal Keberangkatan:
                        </span>{" "}
                        {item.tanggal_keberangkatan}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Foto Passport:</span>{" "}
                        {item.foto_passport ? (
                          <a
                            href={item.foto_passport}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Lihat Foto
                          </a>
                        ) : (
                          "Tidak ada"
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(item.harga_paket)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Integration Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            📋 Integrasi Google Sheets
          </h3>
          <p className="text-sm text-yellow-700">
            Untuk menghubungkan dengan Google Sheets, Anda perlu:
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
            <li>Setup Google Cloud Project dan aktifkan Google Sheets API</li>
            <li>Buat Service Account dan download credentials JSON</li>
            <li>Share Google Sheet dengan email Service Account</li>
            <li>
              Implementasikan fungsi untuk read/write data ke Google Sheets
            </li>
          </ul>
          <p className="text-sm text-yellow-700 mt-2">
            Ganti ENDPOINT dengan URL Web App dari Google Apps Script Anda.
            Script harus menangani POST untuk create, GET dengan action=read
            untuk read, dan action=delete untuk delete. Tambahkan dukungan untuk
            parameter 'sheet' jika diperlukan.
          </p>
        </div>
      </div>
    </div>
  );
};

const CustomerDataPage = () => {
  const [dataList, setDataList] = useState<TravelData[]>([]); // Asumsikan struktur data mirip; sesuaikan jika berbeda
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchName, setSearchName] = useState("");
  const [startDaftar, setStartDaftar] = useState("");
  const [endDaftar, setEndDaftar] = useState("");
  const [startKeberangkatan, setStartKeberangkatan] = useState("");
  const [endKeberangkatan, setEndKeberangkatan] = useState("");
  const [selectedPaket, setSelectedPaket] = useState("");
  const [editData, setEditData] = useState<TravelData | null>(null);
  const [newFotoPassportBase64, setNewFotoPassportBase64] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${ENDPOINT}?action=read&sheet=FormCostumer`,
        {
          mode: "cors",
        }
      );
      if (!response.ok) {
        throw new Error("Gagal memuat data");
      }
      const data = await response.json();
      setDataList(
        data.map((item: any) => ({
          ...item,
          // Perbaikan Kunci: Pastikan id selalu diambil dari nomor_passport
          id: item.nomor_passport.toString(), // Konversi ke string untuk konsistensi
          harga_paket: String(item.harga_paket),
        }))
      );
    } catch (error) {
      setMessage("Terjadi kesalahan saat memuat data");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    if (!value) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(Number(value));
  };

  // Fungsi helper untuk parsing tanggal dari berbagai format
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    try {
      let date: Date | null = null;
      // Handle ISO timestamps directly
      if (dateString.includes("T")) {
        date = new Date(dateString);
      } else {
        // Normalize '/' to '-' and split
        const parts = dateString.replace(/\//g, "-").split("-");
        if (parts.length === 3) {
          let day = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
          // Handle 2-digit year (assume 2000+)
          if (year < 100) year += 2000;
          if (parts[0].length === 4) {
            // yyyy-mm-dd
            day = parseInt(parts[2], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[0], 10);
          } else if (parts[2].length === 4) {
            // dd-mm-yyyy
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
          }
          // Create date and validate
          date = new Date(year, month - 1, day);
        } else {
          // Fallback for other formats
          date = new Date(dateString);
        }
      }
      // Validate
      if (date && !isNaN(date.getTime())) {
        return date;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Fungsi untuk memformat tanggal menjadi dd-mm-yyyy
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = parseDate(dateString);
    if (!date) {
      return dateString; // Kembalikan string asli jika tidak bisa diparse
    }
    // Format ke dd-mm-yyyy
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Fungsi untuk mengkonversi tanggal ke format yyyy-mm-dd untuk perbandingan dan input date
  const dateToComparable = (dateString: string): string => {
    if (!dateString) return "";
    const date = parseDate(dateString);
    if (date === null) return "";
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const filteredData = dataList.filter((item) => {
    const nameMatch = item.nama
      .toLowerCase()
      .includes(searchName.toLowerCase());
    // Konversi tanggal ke format yang bisa dibandingkan (yyyy-mm-dd)
    const itemTanggalDaftar = dateToComparable(item.tanggal_daftar);
    const itemTanggalKeberangkatan = dateToComparable(
      item.tanggal_keberangkatan
    );
    const daftarMatch =
      (!startDaftar || itemTanggalDaftar >= startDaftar) &&
      (!endDaftar || itemTanggalDaftar <= endDaftar);
    const keberangkatanMatch =
      (!startKeberangkatan || itemTanggalKeberangkatan >= startKeberangkatan) &&
      (!endKeberangkatan || itemTanggalKeberangkatan <= endKeberangkatan);
    const paketMatch = !selectedPaket || item.paket_tour === selectedPaket;
    return nameMatch && daftarMatch && keberangkatanMatch && paketMatch;
  });

  const clearFilters = () => {
    setSearchName("");
    setStartDaftar("");
    setEndDaftar("");
    setStartKeberangkatan("");
    setEndKeberangkatan("");
    setSelectedPaket("");
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
    });
    doc.setFontSize(16);
    doc.text("Data Customer", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [
        [
          "No.",
          "Nama",
          "Jenis Kelamin",
          "Tanggal Lahir",
          "No. Passport",
          "Masa Berlaku Passport",
        ],
      ],
      body: filteredData.map((item, index) => [
        index + 1,
        item.nama,
        item.jenis_kelamin,
        formatDate(item.tanggal_lahir),
        item.nomor_passport,
        formatDate(item.masa_berlaku_passport),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 160, 133] },
      margin: { top: 20 },
    });
    doc.save("data_customer.pdf");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${ENDPOINT}?action=delete&passport=${encodeURIComponent(
          id
        )}&sheet=FormCostumer`,
        {
          method: "GET",
          mode: "cors",
        }
      );
      if (!response.ok) {
        throw new Error("Gagal menghapus data");
      }
      setDataList((prev) => prev.filter((item) => item.id !== id));
      setMessage("Data berhasil dihapus!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus data";
      setMessage(errorMessage);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: TravelData) => {
    console.log("Item yang akan diedit:", item); // Debug log
    setEditData({
      ...item,
      tanggal_daftar: dateToComparable(item.tanggal_daftar),
      tanggal_lahir: dateToComparable(item.tanggal_lahir),
      masa_berlaku_passport: dateToComparable(item.masa_berlaku_passport),
      tanggal_keberangkatan: dateToComparable(item.tanggal_keberangkatan),
      harga_paket: String(item.harga_paket),
    });
    setNewFotoPassportBase64(null);
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (editData) {
      if (name === "harga_paket") {
        const rawValue = value.replace(/\./g, "").replace(/\D/g, "");
        setEditData((prev) => ({
          ...prev!,
          [name]: rawValue,
        }));
      } else {
        setEditData((prev) => ({
          ...prev!,
          [name]: value,
        }));
      }
    }
  };

  const handleNewFotoPassportChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setNewFotoPassportBase64(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validateEditForm = () => {
    if (!editData) return false;
    return (
      editData.nama &&
      editData.tanggal_daftar &&
      editData.tanggal_lahir &&
      editData.jenis_kelamin &&
      editData.nomor_passport &&
      editData.masa_berlaku_passport &&
      editData.jenis_trip &&
      editData.paket_tour &&
      editData.durasi_tour &&
      editData.harga_paket
    );
  };

  const handleUpdate = async () => {
    if (!editData || !validateEditForm()) {
      setMessage("Harap isi semua field yang diperlukan");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setIsLoading(true);
    try {
      const dataToSend = {
        ...editData,
        action: "update",
        foto_passport: newFotoPassportBase64
          ? newFotoPassportBase64.split(",")[1]
          : null, // Kirim null jika tidak ada perubahan foto
        sheet: "FormCostumer",
      };
      const response = await fetch(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(dataToSend),
        headers: {
          "Content-Type": "text/plain",
        },
        mode: "cors",
        redirect: "follow",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gagal memperbarui data: ${errorText}`);
      }
      const updatedData = await response.json();
      setDataList((prev) =>
        prev.map((item) =>
          item.id === editData.id
            ? {
                ...editData,
                foto_passport: updatedData.foto_passport || item.foto_passport,
                timestamp: new Date().toLocaleString("id-ID"),
              }
            : item
        )
      );
      setEditData(null);
      setNewFotoPassportBase64(null);
      setMessage("Data berhasil diperbarui!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: unknown) {
      console.error(error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memperbarui data";
      setMessage(errorMessage);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditData(null);
    setNewFotoPassportBase64(null);
  };

  const formatInputNumber = (value: string) => {
    if (!value) return "";
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">
            Data Customer
          </h1>
          <p className="text-gray-600 text-center">
            Daftar data dari sheet FormCostumer
          </p>
          <div className="mt-4 flex justify-center space-x-4">
            <Link to="/" className="text-blue-600 hover:underline">
              Form Perjalanan
            </Link>
            <Link to="/data-customer" className="text-blue-600 hover:underline">
              Data Customer
            </Link>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.includes("berhasil")
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Edit Form if editing */}
        {editData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Edit className="mr-2" size={24} />
              Edit Data
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <User size={16} className="mr-1" />
                  Nama
                </label>
                <input
                  type="text"
                  name="nama"
                  value={editData.nama}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" />
                  Tanggal Daftar
                </label>
                <input
                  type="date"
                  name="tanggal_daftar"
                  value={editData.tanggal_daftar}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" />
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  name="tanggal_lahir"
                  value={editData.tanggal_lahir}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Kelamin
                </label>
                <select
                  name="jenis_kelamin"
                  value={editData.jenis_kelamin}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Jenis Kelamin</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FileText size={16} className="mr-1" />
                  Nomor Passport
                </label>
                <input
                  type="text"
                  name="nomor_passport"
                  value={editData.nomor_passport}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan nomor passport"
                  disabled // Nomor passport tidak bisa diubah
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" />
                  Masa Berlaku Passport
                </label>
                <input
                  type="date"
                  name="masa_berlaku_passport"
                  value={editData.masa_berlaku_passport}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <MapPin size={16} className="mr-1" />
                  Jenis Trip
                </label>
                <select
                  name="jenis_trip"
                  value={editData.jenis_trip}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Jenis Trip</option>
                  <option value="Domestik">Domestik</option>
                  <option value="Internasional">Internasional</option>
                  <option value="Umroh">Umroh</option>
                  <option value="Haji">Haji</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Package size={16} className="mr-1" />
                  Paket Tour
                </label>
                <select
                  name="paket_tour"
                  value={editData.paket_tour}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Paket Tour</option>
                  <option value="Malaysia - Singapore - Thailand">
                    Malaysia - Singapore - Thailand
                  </option>
                  <option value="Malaysia - Singapore">
                    Malaysia - Singapore
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Clock size={16} className="mr-1" />
                  Durasi Tour
                </label>
                <select
                  name="durasi_tour"
                  value={editData.durasi_tour}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Durasi Tour</option>
                  <option value="3D 2N">3D 2N</option>
                  <option value="4D 3N">4D 3N</option>
                  <option value="5D 4N">5D 4N</option>
                  <option value="6D 5N">6D 5N</option>
                  <option value="7D 6N">7D 6N</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <DollarSign size={16} className="mr-1" />
                  Harga Paket
                </label>
                <input
                  type="text"
                  name="harga_paket"
                  value={formatInputNumber(editData.harga_paket)}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan harga paket"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" />
                  Tanggal Keberangkatan
                </label>
                <input
                  type="date"
                  name="tanggal_keberangkatan"
                  value={editData.tanggal_keberangkatan}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Image size={16} className="mr-1" />
                  Ganti Foto Passport (opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewFotoPassportChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {editData.foto_passport && (
                  <p className="text-sm text-gray-500 mt-1">
                    Foto saat ini:{" "}
                    <a
                      href={editData.foto_passport}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600"
                    >
                      Lihat
                    </a>
                  </p>
                )}
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleUpdate}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Save className="mr-2" size={20} />
                  {isLoading ? "Memperbarui..." : "Update Data"}
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex-1 bg-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Filter Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cari Nama
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Masukkan nama"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Daftar Dari
              </label>
              <input
                type="date"
                value={startDaftar}
                onChange={(e) => setStartDaftar(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Daftar Sampai
              </label>
              <input
                type="date"
                value={endDaftar}
                onChange={(e) => setEndDaftar(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Keberangkatan Dari
              </label>
              <input
                type="date"
                value={startKeberangkatan}
                onChange={(e) => setStartKeberangkatan(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Keberangkatan Sampai
              </label>
              <input
                type="date"
                value={endKeberangkatan}
                onChange={(e) => setEndKeberangkatan(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paket Tour
              </label>
              <select
                value={selectedPaket}
                onChange={(e) => setSelectedPaket(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Semua Paket</option>
                <option value="Malaysia - Singapore - Thailand">
                  Malaysia - Singapore - Thailand
                </option>
                <option value="Malaysia - Singapore">
                  Malaysia - Singapore
                </option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex space-x-4">
            <button
              onClick={clearFilters}
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              Clear Filters
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              disabled={filteredData.length === 0}
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Data Customer ({filteredData.length})
          </h2>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Memuat data...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>Tidak ada data yang sesuai filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Daftar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Lahir
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jenis Kelamin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No. Passport
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Masa Berlaku
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jenis Trip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paket Tour
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durasi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Harga Paket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Keberangkatan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Foto Passport
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.nama}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.tanggal_daftar)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.tanggal_lahir)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.jenis_kelamin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.nomor_passport}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.masa_berlaku_passport)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.jenis_trip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.paket_tour}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.durasi_tour}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.harga_paket)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.tanggal_keberangkatan)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.foto_passport ? (
                          <a
                            href={item.foto_passport}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Lihat Foto
                          </a>
                        ) : (
                          "Tidak ada"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 mr-2"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<TravelFormApp />} />
      <Route path="/data-customer" element={<CustomerDataPage />} />
    </Routes>
  </Router>
);

export default App;
