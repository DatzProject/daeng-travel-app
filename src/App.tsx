import React, { useState, useEffect, useRef } from "react";
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
  nomor_invoice: string; // ← BARU
  tanggal_daftar: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  nomor_passport: string;
  masa_berlaku_passport: string;
  jenis_trip: string;
  paket_tour: string;
  durasi_tour: string;
  harga_paket: string;
  bagasi: string;
  tanggal_keberangkatan: string;
};

type TransaksiData = {
  id: string;
  nomor_invoice: string;
  nama: string;
  paket_tour: string;
  harga_paket: string;
  tanggal_daftar: string;
  tanggal_keberangkatan: string;
  durasi_tour: string;
  dp1: string;
  bukti_dp1?: string;
  tanggal_dp1: string;
  dp2: string;
  bukti_dp2?: string;
  tanggal_dp2: string;
  pelunasan: string;
  bukti_pelunasan?: string;
  tanggal_pelunasan: string;
  bagasi: string;
  jumlah_peserta: string;
  diskon: string;
  sisa_pembayaran: string;
  total_pembayaran: string;
  status_pembayaran: string;
};

interface TravelData extends FormData {
  id: string; // Ubah ke string karena nomor_passport adalah string
  timestamp: string;
  foto_passport?: string; // Optional
  old_nomor_passport?: string;
}

const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxCqLV8iq3KoH9jzK1OYUO_NryzzN20-MHLHySfqnLfaUQQJC135DtVC0hoBnMfziQtlQ/exec"; // Ganti dengan URL Web App dari Google Apps Script Anda

const TransaksiPage = () => {
  const HARGA_BAGASI_PER_KG = 27500;
  const [formData, setFormData] = useState<Omit<TransaksiData, "id">>({
    nomor_invoice: "",
    nama: "",
    paket_tour: "",
    harga_paket: "",
    tanggal_daftar: "",
    tanggal_keberangkatan: "",
    durasi_tour: "",
    dp1: "",
    bukti_dp1: "",
    tanggal_dp1: "",
    dp2: "",
    bukti_dp2: "",
    tanggal_dp2: "",
    pelunasan: "",
    bukti_pelunasan: "",
    tanggal_pelunasan: "",
    bagasi: "",
    jumlah_peserta: "1",
    diskon: "0",
    sisa_pembayaran: "0",
    total_pembayaran: "0",
    status_pembayaran: "Belum Lunas",
  });

  const [buktiDp1Base64, setBuktiDp1Base64] = useState<string | null>(null);
  const [buktiDp2Base64, setBuktiDp2Base64] = useState<string | null>(null);
  const [dataList, setDataList] = useState<TransaksiData[]>([]);
  const [customerData, setCustomerData] = useState<TravelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editData, setEditData] = useState<TransaksiData | null>(null);
  const [editBuktiDp1, setEditBuktiDp1] = useState<string | null>(null);
  const [editBuktiDp2, setEditBuktiDp2] = useState<string | null>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const [isEditFormOpened, setIsEditFormOpened] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalOmzet, setTotalOmzet] = useState(0);
  const [buktiPelunasanBase64, setBuktiPelunasanBase64] = useState<
    string | null
  >(null);
  const [editBuktiPelunasan, setEditBuktiPelunasan] = useState<string | null>(
    null
  );

  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    try {
      let date: Date | null = null;
      if (dateString.includes("T")) {
        date = new Date(dateString);
      } else {
        const parts = dateString.replace(/\//g, "-").split("-");
        if (parts.length === 3) {
          let day = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
          if (year < 100) year += 2000;
          if (parts[0].length === 4) {
            day = parseInt(parts[2], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[0], 10);
          }
          date = new Date(year, month - 1, day);
        } else {
          date = new Date(dateString);
        }
      }
      if (date && !isNaN(date.getTime())) {
        return date;
      }
      return null;
    } catch {
      return null;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = parseDate(dateString);
    if (!date) {
      return dateString; // Kembalikan string asli jika tidak bisa diparse
    }
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const dateToComparable = (dateString: string): string => {
    if (!dateString) return "";
    const date = parseDate(dateString);
    if (!date) return "";
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper: Convert DD-MM-YYYY to YYYY-MM-DD for <input type="date" />
  const parseDDMMYYYYToISO = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const [day, month, year] = parts.map((part) => part.padStart(2, "0"));
    const isoDate = `${year}-${month}-${day}`;
    // Validate date
    const d = new Date(isoDate);
    return d.toISOString().split("T")[0] === isoDate ? isoDate : "";
  }; // Fungsi untuk generate nomor invoice otomatis
  const generateInvoiceNumber = () => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, "0");
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const year = today.getFullYear();
    const prefix = `${day}${month}${year}`;

    // Filter invoice dengan prefix hari ini
    const todayInvoices = dataList
      .filter((item) => {
        const invoiceStr = String(item.nomor_invoice || "");
        return invoiceStr.startsWith(prefix);
      })
      .map((item) => String(item.nomor_invoice));

    // Cari nomor urut tertinggi
    let nextNumber = 1;
    if (todayInvoices.length > 0) {
      const numbers = todayInvoices.map((invoice) => {
        const lastThree = invoice.slice(-3); // Ambil 3 digit terakhir
        return parseInt(lastThree) || 0;
      });

      const maxNumber = Math.max(...numbers);
      nextNumber = maxNumber + 1;
    }

    const invoiceNumber = `${prefix}${nextNumber.toString().padStart(3, "0")}`;
    return invoiceNumber;
  };

  // Format angka input
  const formatInputNumber = (value: string) => {
    if (!value) return "";
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (
      [
        "harga_paket",
        "dp1",
        "dp2",
        "pelunasan", // ← TAMBAH
        "bagasi",
        "diskon",
        "jumlah_peserta",
      ].includes(name)
    ) {
      const rawValue = value.replace(/\./g, "").replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: rawValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "dp1" | "dp2" | "pelunasan"
  ) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        if (type === "dp1") setBuktiDp1Base64(reader.result as string);
        else if (type === "dp2") setBuktiDp2Base64(reader.result as string);
        else setBuktiPelunasanBase64(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleEditFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "dp1" | "dp2" | "pelunasan"
  ) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        if (type === "dp1") setEditBuktiDp1(reader.result as string);
        else if (type === "dp2") setEditBuktiDp2(reader.result as string);
        else setEditBuktiPelunasan(reader.result as string); // ← TAMBAH
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const fetchCustomerData = async () => {
    try {
      const res = await fetch(`${ENDPOINT}?action=read&sheet=FormCostumer`, {
        mode: "cors",
      });
      const data = await res.json();
      setCustomerData(data);
    } catch (err) {
      console.error("Gagal memuat data customer:", err);
    }
  };

  const calculatePayments = () => {
    const harga = Number(formData.harga_paket) || 0;
    const kgBagasi = Number(formData.bagasi) || 0;
    const pax = Number(formData.jumlah_peserta) || 1;
    const diskon = Number(formData.diskon) || 0;

    // Hitung total bagasi: Kg × harga per Kg (bukan × pax)
    const totalBagasi = kgBagasi * HARGA_BAGASI_PER_KG;

    const total = harga * pax + totalBagasi - diskon;
    const dp1 = Number(formData.dp1) || 0;
    const dp2 = Number(formData.dp2) || 0;
    const pelunasan = Number(formData.pelunasan) || 0;
    const sisa = total - dp1 - dp2 - pelunasan;

    setFormData((prev) => ({
      ...prev,
      total_pembayaran: String(total),
      sisa_pembayaran: String(sisa),
    }));
  };

  useEffect(() => {
    calculatePayments();
  }, [
    formData.harga_paket,
    formData.bagasi,
    formData.jumlah_peserta,
    formData.diskon,
    formData.dp1,
    formData.dp2,
    formData.pelunasan,
  ]);

  // Auto-generate invoice number ketika nama diisi
  useEffect(() => {
    if (formData.nama && !formData.nomor_invoice) {
      const newInvoice = generateInvoiceNumber();
      setFormData((prev) => ({
        ...prev,
        nomor_invoice: newInvoice,
      }));
    }
  }, [formData.nama, dataList.length]); // Depend on dataList.length untuk update setelah data baru

  // Reset invoice ketika nama dikosongkan
  useEffect(() => {
    if (!formData.nama && formData.nomor_invoice) {
      setFormData((prev) => ({
        ...prev,
        nomor_invoice: "",
      }));
    }
  }, [formData.nama]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${ENDPOINT}?action=read&sheet=Transaksi`, {
        mode: "cors",
      });
      const data = await res.json();
      const formattedData = data.map((item: any) => ({
        ...item,
        id: item.nomor_invoice,
      }));
      setDataList(formattedData);

      const total = formattedData.reduce(
        (sum: number, item: TransaksiData) =>
          sum + Number(item.total_pembayaran || 0),
        0
      );
      setTotalOmzet(total);
    } catch (err) {
      setMessage("Gagal memuat data transaksi");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCustomerData();
  }, []);

  const handleSubmit = async () => {
    if (!formData.nomor_invoice || !formData.nama || !formData.paket_tour) {
      setMessage("Harap isi field wajib");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        bukti_dp1: buktiDp1Base64 ? buktiDp1Base64.split(",")[1] : null,
        bukti_dp2: buktiDp2Base64 ? buktiDp2Base64.split(",")[1] : null,
        bukti_pelunasan: buktiPelunasanBase64
          ? buktiPelunasanBase64.split(",")[1]
          : null,
        sheet: "Transaksi",
      };

      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        mode: "cors",
      });

      if (!res.ok) throw new Error("Gagal menyimpan");
      await fetchData();

      // Reset form
      setFormData({
        nomor_invoice: "",
        nama: "",
        paket_tour: "",
        harga_paket: "",
        tanggal_daftar: "",
        tanggal_keberangkatan: "",
        durasi_tour: "",
        dp1: "",
        bukti_dp1: "",
        tanggal_dp1: "",
        dp2: "",
        bukti_dp2: "",
        tanggal_dp2: "",
        pelunasan: "",
        bukti_pelunasan: "",
        tanggal_pelunasan: "",
        bagasi: "",
        jumlah_peserta: "1",
        diskon: "0",
        sisa_pembayaran: "0",
        total_pembayaran: "0",
        status_pembayaran: "Belum Lunas",
      });
      setBuktiDp1Base64(null);
      setBuktiDp2Base64(null);
      setBuktiPelunasanBase64(null);
      setMessage("Transaksi berhasil disimpan!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message || "Terjadi kesalahan");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus transaksi ini?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${ENDPOINT}?action=delete&passport=${encodeURIComponent(
          id
        )}&sheet=Transaksi`,
        { method: "GET", mode: "cors" }
      );
      if (!res.ok) throw new Error("Gagal menghapus");
      setDataList((prev) => prev.filter((item) => item.id !== id));
      setMessage("Transaksi dihapus!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message || "Gagal menghapus");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: TransaksiData) => {
    setEditData({
      ...item,
      tanggal_dp1: dateToComparable(item.tanggal_dp1),
      tanggal_dp2: dateToComparable(item.tanggal_dp2),
      tanggal_pelunasan: dateToComparable(item.tanggal_pelunasan),
      tanggal_keberangkatan: dateToComparable(item.tanggal_keberangkatan),
      tanggal_daftar: dateToComparable(item.tanggal_daftar),
    });
    setEditBuktiDp1(null);
    setEditBuktiDp2(null);
    setEditBuktiPelunasan(null);
    setIsEditFormOpened(true);
  };

  const calculateEditPayments = () => {
    if (!editData) return;
    const harga = Number(editData.harga_paket) || 0;
    const kgBagasi = Number(editData.bagasi) || 0;
    const pax = Number(editData.jumlah_peserta) || 1;
    const diskon = Number(editData.diskon) || 0;

    const totalBagasi = kgBagasi * HARGA_BAGASI_PER_KG;
    const total = harga * pax + totalBagasi - diskon;
    const dp1 = Number(editData.dp1) || 0;
    const dp2 = Number(editData.dp2) || 0;
    const pelunasan = Number(editData.pelunasan) || 0;
    const sisa = total - dp1 - dp2 - pelunasan;

    setEditData((prev) => ({
      ...prev!,
      total_pembayaran: String(total),
      sisa_pembayaran: String(sisa),
    }));
  };

  useEffect(() => {
    calculateEditPayments();
  }, [
    editData?.harga_paket,
    editData?.bagasi,
    editData?.jumlah_peserta,
    editData?.diskon,
    editData?.dp1,
    editData?.dp2,
    editData?.pelunasan,
  ]);

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (editData) {
      if (
        [
          "harga_paket",
          "dp1",
          "dp2",
          "pelunasan",
          "bagasi",
          "diskon",
          "jumlah_peserta",
        ].includes(name)
      ) {
        // <-- Removed "durasi_tour"
        const rawValue = value.replace(/\./g, "").replace(/\D/g, "");
        setEditData({ ...editData, [name]: rawValue });
      } else {
        setEditData({ ...editData, [name]: value });
      }
    }
  };

  const handleUpdate = async () => {
    if (!editData) return;
    setIsLoading(true);
    try {
      const payload = {
        ...editData,
        action: "update",
        old_nomor_passport: editData.nomor_invoice,
        bukti_dp1: editBuktiDp1 ? editBuktiDp1.split(",")[1] : null,
        bukti_dp2: editBuktiDp2 ? editBuktiDp2.split(",")[1] : null,
        bukti_pelunasan: editBuktiPelunasan
          ? editBuktiPelunasan.split(",")[1]
          : null,
        sheet: "Transaksi",
      };

      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        mode: "cors",
      });

      if (!res.ok) throw new Error("Gagal memperbarui");
      await fetchData();
      setEditData(null);
      setMessage("Transaksi diperbarui!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message || "Gagal memperbarui");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string) =>
    value
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(Number(value))
      : "";

  useEffect(() => {
    if (isEditFormOpened && editFormRef.current) {
      editFormRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setIsEditFormOpened(false);
    }
  }, [isEditFormOpened]);

  // Fungsi helper format number dengan titik
  const formatNumber = (num: string) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Fungsi terbilang Rupiah
  const bilangRupiah = (angka: number): string => {
    const bilangan = [
      "",
      "Satu",
      "Dua",
      "Tiga",
      "Empat",
      "Lima",
      "Enam",
      "Tujuh",
      "Delapan",
      "Sembilan",
      "Sepuluh",
      "Sebelas",
    ];
    if (angka < 12) return bilangan[angka];
    if (angka < 20) return bilangRupiah(angka - 10) + " Belas";
    if (angka < 100)
      return (
        bilangRupiah(Math.floor(angka / 10)) +
        " Puluh" +
        (angka % 10 ? " " + bilangRupiah(angka % 10) : "")
      );
    if (angka < 200)
      return "Seratus" + (angka % 100 ? " " + bilangRupiah(angka % 100) : "");
    if (angka < 1000)
      return (
        bilangRupiah(Math.floor(angka / 100)) +
        " Ratus" +
        (angka % 100 ? " " + bilangRupiah(angka % 100) : "")
      );
    if (angka < 2000)
      return "Seribu" + (angka % 1000 ? " " + bilangRupiah(angka % 1000) : "");
    if (angka < 1000000)
      return (
        bilangRupiah(Math.floor(angka / 1000)) +
        " Ribu" +
        (angka % 1000 ? " " + bilangRupiah(angka % 1000) : "")
      );
    if (angka < 1000000000)
      return (
        bilangRupiah(Math.floor(angka / 1000000)) +
        " Juta" +
        (angka % 1000000 ? " " + bilangRupiah(angka % 1000000) : "")
      );
    return "";
  };

  // Fungsi untuk menghitung periode
  const calculatePeriod = (
    tanggalKeberangkatan: string,
    durasiTour: string
  ): string => {
    const date = parseDate(tanggalKeberangkatan);
    if (!date) return "Invalid Date";

    const dayMatch = durasiTour.match(/^(\d+)D/);
    const days = dayMatch ? parseInt(dayMatch[1], 10) : 1;

    const endDate = new Date(date);
    endDate.setDate(date.getDate() + days - 1);

    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "long",
      year: "numeric",
    };
    const startDateFormatted = date.toLocaleDateString("id-ID", options);
    const endDateFormatted = endDate.toLocaleDateString("id-ID", options);

    return `${startDateFormatted} - ${endDateFormatted}`;
  };

  const handleDownloadInvoice = (item: TransaksiData) => {
    const HARGA_BAGASI_PER_KG = 27500; // ← TAMBAH INI di dalam fungsi juga

    const pax = Number(item.jumlah_peserta) || 1;
    const hargaPaket = Number(item.harga_paket) || 0;
    const kgBagasi = Number(item.bagasi) || 0; // ← bagasi adalah Kg
    const diskon = Number(item.diskon) || 0;

    const totalAmount = hargaPaket * pax;
    const totalBagasi = kgBagasi * HARGA_BAGASI_PER_KG; // ← UBAH INI
    const grandTotal = totalAmount + totalBagasi - diskon;

    const pricePerPax = hargaPaket.toString();
    const hargaBagasiPerKg = HARGA_BAGASI_PER_KG.toString(); // ← UBAH INI

    const program =
      item.paket_tour +
      "  " +
      item.durasi_tour.replace("D ", "H").replace("N", "M");

    const tanggal = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const invoiceNo = item.nomor_invoice;
    const terbilang = bilangRupiah(grandTotal) + " Rupiah";

    const doc = new jsPDF();

    try {
      doc.addImage("/logo_daeng_travel.png", "PNG", 10, 17, 40, 16);
    } catch (e) {
      console.log("Logo tidak ditemukan");
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CV. DAENG WISATA INDONESIA TOUR & TRAVEL", 105, 20, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.text("Call/WA: 085256 268 727", 105, 25, { align: "center" });
    doc.text("Email: daengwisataindonesia@gmail.com", 105, 30, {
      align: "center",
    });
    doc.text("Head Office: Perumahan Green House Alauddin, Makassar", 105, 35, {
      align: "center",
    });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(10, 40, 200, 40);

    doc.setFontSize(10);
    doc.text("Booking Konfirmasi:", 15, 60);
    doc.text(`Tanggal : ${tanggal}`, 15, 70);
    doc.text(`Invoice No : ${invoiceNo}`, 105, 70);
    doc.text(`Nama : ${item.nama}`, 15, 80);
    doc.text(`Peserta : ${pax} Pax`, 105, 80);
    doc.text(`Program : Tour ${program}`, 15, 90);

    const periode = calculatePeriod(
      item.tanggal_keberangkatan,
      item.durasi_tour
    );
    doc.text(`Periode : ${periode}`, 15, 100);

    // Detail Invoice Table
    const invoiceBody = [
      [
        "1",
        `Paket Tour ${program}`,
        formatNumber(pricePerPax),
        "1",
        String(pax),
        formatNumber(totalAmount.toString()),
      ],
    ];

    // Tambahkan baris bagasi jika ada
    if (totalBagasi > 0) {
      invoiceBody.push([
        "2",
        "Biaya Bagasi",
        formatNumber(hargaBagasiPerKg), // ← harga per Kg
        "-",
        String(kgBagasi) + " Kg", // ← UBAH INI: tampilkan Kg, bukan pax
        formatNumber(totalBagasi.toString()),
      ]);
    }

    // Tambahkan baris diskon jika ada
    if (diskon > 0) {
      invoiceBody.push([
        totalBagasi > 0 ? "3" : "2",
        "Diskon",
        "-",
        "-",
        "-",
        "-" + formatNumber(diskon.toString()),
      ]);
    }

    autoTable(doc, {
      startY: 110,
      head: [["No", "Description", "Price", "Pkg", "Pax", "Total"]],
      body: invoiceBody,
      foot: [["", "", "", "", "Total", formatNumber(grandTotal.toString())]],
      theme: "grid",
      styles: { fontSize: 10 },
    });

    // Tabel "Says"
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      body: [[`Says: ${terbilang}`]],
      theme: "grid",
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: "auto" } },
    });

    // Tabel DP dan Sisa
    const dp1Display = item.dp1 ? formatNumber(item.dp1) : "";
    const dp2Display = item.dp2 ? formatNumber(item.dp2) : "";
    const sisaDisplay = formatNumber(item.sisa_pembayaran);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      body: [
        ["DP1", dp1Display],
        ["DP2", dp2Display],
        ["Sisa", sisaDisplay],
      ],
      theme: "grid",
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 50 } },
    });

    // NOTE
    let yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`NOTE: ${item.status_pembayaran.toUpperCase()}`, 15, yPos);
    doc.text(
      "Balance/Pelunasan paling lambat H-20 Keberangkatan",
      15,
      yPos + 10
    );

    // Bank Account
    yPos += 20;
    doc.text("BANK ACCOUNT", 15, yPos);
    yPos += 10;
    doc.text("BANK MANDIRI", 15, yPos);
    doc.text("Account No : 1810 0020 03748", 15, yPos + 5);
    doc.text("Beneficiary: MUHAMMAD AZHAR", 15, yPos + 10);
    yPos += 20;
    doc.text("BANK BCA", 15, yPos);
    doc.text("Account No : 7970 42 6064", 15, yPos + 5);
    doc.text("Beneficiary: MUHAMMAD AZHAR", 15, yPos + 10);
    yPos += 20;
    doc.text("BANK BRI", 15, yPos);
    doc.text("AccountNo.: 382401017088539", 15, yPos + 5);
    doc.text("Beneficiary: MUHAMMAD AZHAR", 15, yPos + 10);
    yPos += 20;
    doc.text("BANK BNI", 15, yPos);
    doc.text("Account No. : 0558 67 7534", 15, yPos + 5);
    doc.text("Beneficiary: MUHAMMAD AZHAR", 15, yPos + 10);
    doc.text("Account No. : 2410 61 2436", 15, yPos + 15);
    doc.text("Beneficiary: MUHAMMAD AZHAR", 15, yPos + 20);

    // Best Regards
    doc.text("Best Regards", 150, yPos + 30);
    doc.text("Daeng Travel", 150, yPos + 50);

    doc.save(`invoice_${item.nomor_invoice}.pdf`);
  };

  // Fungsi untuk menghitung jumlah peserta yang sudah terinput di customer
  const getRegisteredCount = (invoiceNumber: string): number => {
    return customerData.filter(
      (customer) => customer.nomor_invoice === invoiceNumber
    ).length;
  };

  // Fungsi untuk menghitung sisa peserta
  const getRemainingParticipants = (item: TransaksiData): number => {
    const totalPeserta = Number(item.jumlah_peserta) || 0;
    const registered = getRegisteredCount(item.nomor_invoice);
    return totalPeserta - registered;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {isLoading && (
        <>
          {/* Overlay untuk form area saja */}
          <div
            className="fixed bg-black bg-opacity-30 pointer-events-auto"
            style={{
              top: "200px", // Mulai dari bawah menu
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
            }}
          />
          {/* Loading indicator */}
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 40 }}
          >
            <div className="bg-white rounded-lg p-8 shadow-xl text-center mt-64">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-xl font-semibold text-gray-800">
                Mohon Tunggu...
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Sedang memuat data transaksi
              </p>
            </div>
          </div>
        </>
      )}
      <div className="max-w-6xl mx-auto">
        <div
          className="bg-white rounded-lg shadow-lg p-6 mb-6 text-center sticky top-0"
          style={{ zIndex: 50 }}
        >
          <div className="mb-4">
            <img
              src="/logo_daeng_travel.png"
              alt="Logo Aplikasi"
              className="mx-auto h-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Transaksi</h1>
          <div className="mt-4 flex justify-center space-x-4">
            <Link to="/" className="text-blue-600 hover:underline">
              Form Perjalanan
            </Link>
            <Link to="/data-customer" className="text-blue-600 hover:underline">
              Data Customer
            </Link>
            <Link to="/transaksi" className="text-blue-600 hover:underline">
              Transaksi
            </Link>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.includes("berhasil")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {totalOmzet > 0 && (
          <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-6 text-center">
            <h2 className="text-xl font-bold text-green-800">
              Total Omzet: {formatCurrency(String(totalOmzet))}
            </h2>
            <p className="text-sm text-green-600 mt-1">
              Berdasarkan total pembayaran semua transaksi ({dataList.length}{" "}
              item)
            </p>
          </div>
        )}

        {/* Form Input */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Plus className="mr-2" size={24} />
            Tambah Transaksi Baru
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <FileText size={16} className="mr-1" />
                Nomor Invoice
              </label>
              <input
                type="text"
                name="nomor_invoice"
                value={formData.nomor_invoice}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                placeholder="Masukkan nomor invoice"
                readOnly // <-- Tidak bisa diedit, tapi tetap bisa dikirim
              />
            </div>
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
                <option value="Bangkok - Pattaya">
                  Bangkok - Pattaya
                </option>
              </select>
            </div>
            {/* Durasi Tour */}
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
                placeholder="Contoh: 5000000"
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
                <User size={16} className="mr-1" />
                Jumlah Peserta
              </label>
              <input
                type="number"
                name="jumlah_peserta"
                value={formData.jumlah_peserta}
                onChange={handleInputChange}
                min="1"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Package size={16} className="mr-1" />
                Jumlah Bagasi (Kg) - Rp 27.500/Kg
              </label>
              <input
                type="text"
                name="bagasi"
                value={formatInputNumber(formData.bagasi)}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contoh: 20"
              />
              {formData.bagasi && (
                <p className="text-sm text-gray-600 mt-1">
                  Total:{" "}
                  {formatCurrency(
                    String(Number(formData.bagasi) * HARGA_BAGASI_PER_KG)
                  )}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <DollarSign size={16} className="mr-1" />
                Diskon (Opsional)
              </label>
              <input
                type="text"
                name="diskon"
                value={formatInputNumber(formData.diskon)}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contoh: 200000"
              />
            </div>

            {/* Total Pembayaran (calculated, read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <DollarSign size={16} className="mr-1" />
                Total Pembayaran
              </label>
              <input
                type="text"
                name="total_pembayaran"
                value={formatInputNumber(formData.total_pembayaran)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                readOnly
              />
            </div>

            {/* DP1 Section */}
            <div className="border-t pt-4">
              <h3 className="text-md font-medium text-gray-800 mb-3">
                Pembayaran DP1
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar size={16} className="mr-1" />
                    Tanggal DP1
                  </label>
                  <input
                    type="date"
                    name="tanggal_dp1"
                    value={formData.tanggal_dp1}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <DollarSign size={16} className="mr-1" />
                    Jumlah DP1
                  </label>
                  <input
                    type="text"
                    name="dp1"
                    value={formatInputNumber(formData.dp1)}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contoh: 1000000"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Image size={16} className="mr-1" />
                  Bukti Transfer DP1
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "dp1")}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* DP2 Section */}
            <div className="border-t pt-4">
              <h3 className="text-md font-medium text-gray-800 mb-3">
                Pembayaran DP2
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar size={16} className="mr-1" />
                    Tanggal DP2
                  </label>
                  <input
                    type="date"
                    name="tanggal_dp2"
                    value={formData.tanggal_dp2}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <DollarSign size={16} className="mr-1" />
                    Jumlah DP2
                  </label>
                  <input
                    type="text"
                    name="dp2"
                    value={formatInputNumber(formData.dp2)}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contoh: 1500000"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Image size={16} className="mr-1" />
                  Bukti Transfer DP2
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "dp2")}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Pelunasan Section */}
            <div className="border-t pt-4">
              <h3 className="text-md font-medium text-gray-800 mb-3">
                Pelunasan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar size={16} className="mr-1" />
                    Tanggal Pelunasan
                  </label>
                  <input
                    type="date"
                    name="tanggal_pelunasan"
                    value={formData.tanggal_pelunasan}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <DollarSign size={16} className="mr-1" />
                    Jumlah Pelunasan
                  </label>
                  <input
                    type="text"
                    name="pelunasan"
                    value={formatInputNumber(formData.pelunasan)}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contoh: 2000000"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Image size={16} className="mr-1" />
                  Bukti Transfer Pelunasan
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "pelunasan")}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sisa Pembayaran (calculated, read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <DollarSign size={16} className="mr-1" />
                Sisa Pembayaran
              </label>
              <input
                type="text"
                name="sisa_pembayaran"
                value={formatInputNumber(formData.sisa_pembayaran)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                readOnly
              />
            </div>

            {/* Status Pembayaran */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Pembayaran
              </label>
              <select
                name="status_pembayaran"
                value={formData.status_pembayaran}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Belum Lunas">Belum Lunas</option>
                <option value="Lunas">Lunas</option>
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Save className="mr-2" size={20} />
              {isLoading ? "Menyimpan..." : "Simpan Transaksi"}
            </button>
          </div>
        </div>

        {/* Edit Form */}
        {editData && (
          <div
            ref={editFormRef}
            className="bg-white rounded-lg shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Edit className="mr-2" size={24} />
              Edit Transaksi
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FileText size={16} className="mr-1" />
                  Nomor Invoice
                </label>
                <input
                  type="text"
                  name="nomor_invoice"
                  value={editData.nomor_invoice}
                  onChange={(e) =>
                    setEditData({ ...editData, nomor_invoice: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan nomor invoice"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <User size={16} className="mr-1" />
                  Nama
                </label>
                <input
                  type="text"
                  name="nama"
                  value={editData.nama}
                  onChange={(e) =>
                    setEditData({ ...editData, nama: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Package size={16} className="mr-1" />
                  Paket Tour
                </label>
                <select
                  name="paket_tour"
                  value={editData.paket_tour}
                  onChange={(e) =>
                    setEditData({ ...editData, paket_tour: e.target.value })
                  }
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
              {/* Durasi Tour */}
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
                  placeholder="Contoh: 5000000"
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
                  onChange={(e) =>
                    setEditData({ ...editData, tanggal_daftar: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      tanggal_keberangkatan: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <User size={16} className="mr-1" />
                  Jumlah Peserta
                </label>
                <input
                  type="number"
                  name="jumlah_peserta"
                  value={editData.jumlah_peserta}
                  onChange={handleEditInputChange}
                  min="1"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Package size={16} className="mr-1" />
                  Jumlah Bagasi (Kg) - Rp 27.500/Kg
                </label>
                <input
                  type="text"
                  name="bagasi"
                  value={formatInputNumber(editData.bagasi)}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contoh: 20"
                />
                {editData.bagasi && (
                  <p className="text-sm text-gray-600 mt-1">
                    Total:{" "}
                    {formatCurrency(
                      String(Number(editData.bagasi) * HARGA_BAGASI_PER_KG)
                    )}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <DollarSign size={16} className="mr-1" />
                  Diskon (Opsional)
                </label>
                <input
                  type="text"
                  name="diskon"
                  value={formatInputNumber(editData.diskon)}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contoh: 200000"
                />
              </div>

              {/* Total Pembayaran (calculated, read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <DollarSign size={16} className="mr-1" />
                  Total Pembayaran
                </label>
                <input
                  type="text"
                  name="total_pembayaran"
                  value={formatInputNumber(editData.total_pembayaran)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  readOnly
                />
              </div>

              {/* DP1 Section */}
              <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-800 mb-3">
                  Pembayaran DP1
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Calendar size={16} className="mr-1" />
                      Tanggal DP1
                    </label>
                    <input
                      type="date"
                      name="tanggal_dp1"
                      value={editData.tanggal_dp1} // <-- ini sudah YYYY-MM-DD berkat parseDDMMYYYYToISO
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          tanggal_dp1: e.target.value, // <-- ini tetap YYYY-MM-DD
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <DollarSign size={16} className="mr-1" />
                      Jumlah DP1
                    </label>
                    <input
                      type="text"
                      name="dp1"
                      value={formatInputNumber(editData.dp1)}
                      onChange={handleEditInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Contoh: 1000000"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Image size={16} className="mr-1" />
                    Bukti Transfer DP1 Baru (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleEditFileChange(e, "dp1")}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {editData.bukti_dp1 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Bukti saat ini:{" "}
                      <a
                        href={editData.bukti_dp1}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Lihat Bukti DP1
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* DP2 Section */}
              <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-800 mb-3">
                  Pembayaran DP2
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Calendar size={16} className="mr-1" />
                      Tanggal DP2
                    </label>
                    <input
                      type="date"
                      name="tanggal_dp2"
                      value={editData.tanggal_dp2}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          tanggal_dp2: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <DollarSign size={16} className="mr-1" />
                      Jumlah DP2
                    </label>
                    <input
                      type="text"
                      name="dp2"
                      value={formatInputNumber(editData.dp2)}
                      onChange={handleEditInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Contoh: 1500000"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Image size={16} className="mr-1" />
                    Bukti Transfer DP2 Baru (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleEditFileChange(e, "dp2")}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {editData.bukti_dp2 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Bukti saat ini:{" "}
                      <a
                        href={editData.bukti_dp2}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Lihat Bukti DP2
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Pelunasan Section */}
              <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-800 mb-3">
                  Pelunasan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Calendar size={16} className="mr-1" />
                      Tanggal Pelunasan
                    </label>
                    <input
                      type="date"
                      name="tanggal_pelunasan"
                      value={editData.tanggal_pelunasan}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          tanggal_pelunasan: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <DollarSign size={16} className="mr-1" />
                      Jumlah Pelunasan
                    </label>
                    <input
                      type="text"
                      name="pelunasan"
                      value={formatInputNumber(editData.pelunasan)}
                      onChange={handleEditInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Contoh: 2000000"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Image size={16} className="mr-1" />
                    Bukti Transfer Pelunasan Baru (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleEditFileChange(e, "pelunasan")}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {editData.bukti_pelunasan && (
                    <p className="text-sm text-gray-500 mt-2">
                      Bukti saat ini:{" "}
                      <a
                        href={editData.bukti_pelunasan}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Lihat Bukti Pelunasan
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Sisa Pembayaran (calculated, read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <DollarSign size={16} className="mr-1" />
                  Sisa Pembayaran
                </label>
                <input
                  type="text"
                  name="sisa_pembayaran"
                  value={formatInputNumber(editData.sisa_pembayaran)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  readOnly
                />
              </div>

              {/* Status Pembayaran */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Pembayaran
                </label>
                <select
                  name="status_pembayaran"
                  value={editData.status_pembayaran}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      status_pembayaran: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Belum Lunas">Belum Lunas</option>
                  <option value="Lunas">Lunas</option>
                </select>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleUpdate}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Save className="mr-2" size={20} />
                  {isLoading ? "Memperbarui..." : "Simpan Perubahan"}
                </button>
                <button
                  onClick={() => setEditData(null)}
                  className="flex-1 bg-gray-400 text-white py-3 px-4 rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabel Data */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Daftar Transaksi ({dataList.length})
          </h2>
          {isLoading ? (
            <p>Memuat...</p>
          ) : dataList.length === 0 ? (
            <p className="text-center py-4">Belum ada data transaksi</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      No Invoice
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Paket
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Durasi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Harga Paket
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tgl Daftar
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tgl Berangkat
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      DP1
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bukti DP1
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tgl DP1
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      DP2
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bukti DP2
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tgl DP2
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Pelunasan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bukti Pelunasan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tgl Pelunasan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Bagasi (Kg)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Jml Peserta
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Diskon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sisa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sisa Peserta
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {item.nomor_invoice}
                      </td>
                      <td className="px-4 py-3 text-sm">{item.nama}</td>
                      <td className="px-4 py-3 text-sm">{item.paket_tour}</td>
                      <td className="px-4 py-3 text-sm">{item.durasi_tour}</td>
                      <td className="px-4 py-3 text-sm">
                        {formatCurrency(item.harga_paket)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(item.tanggal_daftar)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(item.tanggal_keberangkatan)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatCurrency(item.dp1)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.bukti_dp1 ? (
                          <a
                            href={item.bukti_dp1}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Lihat
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(item.tanggal_dp1)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatCurrency(item.dp2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.bukti_dp2 ? (
                          <a
                            href={item.bukti_dp2}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Lihat
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(item.tanggal_dp2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatCurrency(item.pelunasan)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.bukti_pelunasan ? (
                          <a
                            href={item.bukti_pelunasan}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Lihat
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(item.tanggal_pelunasan)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.bagasi ? `${formatNumber(item.bagasi)} Kg` : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.jumlah_peserta}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.diskon ? formatCurrency(item.diskon) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {formatCurrency(item.total_pembayaran)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatCurrency(item.sisa_pembayaran)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={
                            item.status_pembayaran === "Lunas"
                              ? "text-green-600 font-bold"
                              : "text-red-600 font-semibold"
                          }
                        >
                          {item.status_pembayaran}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={
                            getRemainingParticipants(item) === 0
                              ? "text-green-600 font-bold"
                              : "text-orange-600 font-semibold"
                          }
                        >
                          {getRemainingParticipants(item)} /{" "}
                          {item.jumlah_peserta}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800 mr-2"
                        >
                          Hapus
                        </button>
                        <button
                          onClick={() => handleDownloadInvoice(item)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Invoice
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

const TravelFormApp = () => {
  const [formData, setFormData] = useState<FormData>({
    nama: "",
    nomor_invoice: "", // ← BARU
    tanggal_daftar: "",
    tanggal_lahir: "",
    jenis_kelamin: "",
    nomor_passport: "",
    masa_berlaku_passport: "",
    jenis_trip: "",
    paket_tour: "",
    durasi_tour: "",
    harga_paket: "",
    bagasi: "",
    tanggal_keberangkatan: "",
  });
  const [fotoPassportBase64, setFotoPassportBase64] = useState<string | null>(
    null
  );
  const [dataList, setDataList] = useState<TravelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [showScanUpload, setShowScanUpload] = useState(false);
  const [scanPassportBase64, setScanPassportBase64] = useState<string | null>(
    null
  );
  const [isProcessingScanOCR, setIsProcessingScanOCR] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState<
    { invoice: string; name: string }[]
  >([]);
  const [transaksiData, setTransaksiData] = useState<TransaksiData[]>([]);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [filteredInvoices, setFilteredInvoices] = useState<
    { invoice: string; name: string }[]
  >([]);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  // Helper: Convert DD-MM-YYYY to YYYY-MM-DD for <input type="date" />
  const convertDDMMYYYYToISO = (dateStr: string): string => {
    if (!dateStr) return "";

    // Remove any whitespace
    dateStr = dateStr.trim();

    // Check if already in ISO format (YYYY-MM-DD)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    // Handle DD-MM-YYYY format
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      // Simply return the reformatted string without Date object validation
      // to avoid timezone issues
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // Handle DD/MM/YYYY format (with slashes)
    const ddmmyyyySlashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyySlashMatch) {
      const [, day, month, year] = ddmmyyyySlashMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // Try to parse as Date object as fallback
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        // Get date components in local timezone to avoid offset issues
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error("Failed to parse date:", dateStr);
    }

    return "";
  };

  useEffect(() => {
    if (formData.nomor_invoice) {
      const lowerQuery = formData.nomor_invoice.toLowerCase();
      const filtered = invoiceOptions.filter(
        (option) =>
          option.invoice.toLowerCase().includes(lowerQuery) ||
          option.name.toLowerCase().includes(lowerQuery)
      );
      setFilteredInvoices(filtered);
    } else {
      setFilteredInvoices(invoiceOptions);
    }
  }, [formData.nomor_invoice, invoiceOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        invoiceInputRef.current &&
        !invoiceInputRef.current.contains(event.target as Node)
      ) {
        setShowInvoiceDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch data customer & invoice sekali saat mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${ENDPOINT}?action=read&sheet=FormCostumer`,
          { mode: "cors" }
        );
        if (!response.ok) throw new Error("Gagal memuat data");
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

    const fetchInvoiceOptions = async () => {
      try {
        const res = await fetch(`${ENDPOINT}?action=read&sheet=Transaksi`, {
          mode: "cors",
        });
        const data: TransaksiData[] = await res.json();
        // Ubah: Map ke objek { invoice, name }, filter jika invoice ada
        const options = data
          .map((item) => ({
            invoice: item.nomor_invoice,
            name: item.nama || "Nama Tidak Tersedia", // Fallback jika nama kosong
          }))
          .filter((opt) => opt.invoice); // Filter hanya yang punya invoice
        setInvoiceOptions(options);
        setTransaksiData(data); // Tetap simpan data full untuk autofill
      } catch (err) {
        console.error("Gagal memuat daftar invoice:", err);
      }
    };

    fetchData();
    fetchInvoiceOptions();
  }, []);

  // ← BARU: useEffect untuk autofill field berdasarkan nomor_invoice
  useEffect(() => {
    if (formData.nomor_invoice && transaksiData.length > 0) {
      const selectedTransaksi = transaksiData.find(
        (item) => item.nomor_invoice === formData.nomor_invoice
      );
      if (selectedTransaksi) {
        console.log("Data Transaksi ditemukan:", selectedTransaksi);
        console.log(
          "Tanggal keberangkatan mentah:",
          selectedTransaksi.tanggal_keberangkatan
        );

        const convertedDate = convertDDMMYYYYToISO(
          selectedTransaksi.tanggal_keberangkatan
        );
        console.log("Tanggal keberangkatan terkonversi:", convertedDate);

        setFormData((prev) => ({
          ...prev,
          paket_tour: selectedTransaksi.paket_tour || "",
          durasi_tour: selectedTransaksi.durasi_tour || "",
          tanggal_keberangkatan: convertedDate,
          harga_paket: selectedTransaksi.harga_paket || "",
          tanggal_daftar:
            convertDDMMYYYYToISO(selectedTransaksi.tanggal_daftar) || "",
        }));
      } else {
        console.log("Invoice tidak ditemukan:", formData.nomor_invoice);
        // Opsional: Reset field jika invoice tidak ditemukan
        setFormData((prev) => ({
          ...prev,
          paket_tour: "",
          durasi_tour: "",
          tanggal_keberangkatan: "",
          harga_paket: "",
          tanggal_daftar: "",
        }));
      }
    }
  }, [formData.nomor_invoice, transaksiData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "harga_paket" || name === "bagasi") {
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
      formData.tanggal_lahir &&
      formData.jenis_kelamin &&
      formData.nomor_passport
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
          : null,
        sheet: "FormCostumer",
      };
      const response = await fetch(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(dataToSend),
        headers: { "Content-Type": "text/plain" },
        mode: "cors",
        redirect: "follow",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gagal menyimpan data: ${errorText}`);
      }
      const newData = await response.json();
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
        nomor_invoice: "", // reset juga
        tanggal_daftar: "",
        tanggal_lahir: "",
        jenis_kelamin: "",
        nomor_passport: "",
        masa_berlaku_passport: "",
        jenis_trip: "",
        paket_tour: "",
        durasi_tour: "",
        harga_paket: "",
        bagasi: "",
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
        )}&sheet=FormCostumer`,
        { method: "GET", mode: "cors" }
      );
      if (!response.ok) throw new Error("Gagal menghapus data");
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
      {isLoading && (
        <>
          {/* Overlay untuk form area saja */}
          <div
            className="fixed bg-black bg-opacity-30 pointer-events-auto"
            style={{
              top: "200px", // Mulai dari bawah menu
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
            }}
          />
          {/* Loading indicator */}
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 40 }}
          >
            <div className="bg-white rounded-lg p-8 shadow-xl text-center mt-64">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-xl font-semibold text-gray-800">
                Mohon Tunggu...
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Sedang memuat data perjalanan
              </p>
            </div>
          </div>
        </>
      )}
      <div className="max-w-6xl mx-auto">
        <div
          className="bg-white rounded-lg shadow-lg p-6 mb-6 text-center sticky top-0"
          style={{ zIndex: 50 }}
        >
          <div className="mb-4">
            <img
              src="/logo_daeng_travel.png"
              alt="Logo Aplikasi"
              className="mx-auto h-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Aplikasi Data Perjalanan
          </h1>
          <p className="text-gray-600">
            Kelola data perjalanan dan paket tour dengan mudah
          </p>
          <div className="mt-4 flex justify-center space-x-4">
            <Link to="/" className="text-blue-600 hover:underline">
              Form Perjalanan
            </Link>
            <Link to="/data-customer" className="text-blue-600 hover:underline">
              Data Customer
            </Link>
            <Link to="/transaksi" className="text-blue-600 hover:underline">
              Transaksi
            </Link>
          </div>
        </div>

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
              <Plus className="mr-2" size={24} /> Tambah Data Baru
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <User size={16} className="mr-1" /> Nama
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

              {/* Dropdown Nomor Invoice */}
              <div className="relative" ref={invoiceInputRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FileText size={16} className="mr-1" /> Nomor Invoice
                </label>
                <input
                  type="text"
                  name="nomor_invoice"
                  value={formData.nomor_invoice}
                  onChange={handleInputChange}
                  onFocus={() => setShowInvoiceDropdown(true)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ketik atau pilih nomor invoice"
                  autoComplete="off"
                />
                {showInvoiceDropdown && filteredInvoices.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredInvoices.map((option) => (
                      <div
                        key={option.invoice} // Key berdasarkan invoice unik
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            nomor_invoice: option.invoice, // Set hanya invoice ke formData
                          }));
                          setShowInvoiceDropdown(false);
                        }}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                      >
                        {option.invoice} - {option.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sisa form tetap sama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" /> Tanggal Daftar
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
                  <Calendar size={16} className="mr-1" /> Tanggal Lahir
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
                  <FileText size={16} className="mr-1" /> Nomor Passport
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
                  <Calendar size={16} className="mr-1" /> Masa Berlaku Passport
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
                  <MapPin size={16} className="mr-1" /> Jenis Trip
                </label>
                <select
                  name="jenis_trip"
                  value={formData.jenis_trip}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Jenis Trip</option>
                  <option value="Konsorsium">Konsorsium</option>
                  <option value="Open Trip">Open Trip</option>
                  <option value="Family Trip">Family Trip</option>
                  <option value="Group Trip">Group Trip</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Package size={16} className="mr-1" /> Paket Tour
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
                  <Clock size={16} className="mr-1" /> Durasi Tour
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
                  <DollarSign size={16} className="mr-1" /> Harga Paket
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
                  <Package size={16} className="mr-1" /> Harga Bagasi (Opsional)
                </label>
                <input
                  type="text"
                  name="bagasi"
                  value={formatInputNumber(formData.bagasi)}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contoh: 300000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" /> Tanggal Keberangkatan
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
                  <Image size={16} className="mr-1" /> Foto Passport
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
          </p>
        </div>
      </div>
    </div>
  );
};

const CustomerDataPage = () => {
  const [dataList, setDataList] = useState<TravelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchName, setSearchName] = useState("");
  const [startDaftar, setStartDaftar] = useState("");
  const [endDaftar, setEndDaftar] = useState("");
  const [startKeberangkatan, setStartKeberangkatan] = useState("");
  const [selectedPaket, setSelectedPaket] = useState("");
  const [editData, setEditData] = useState<TravelData | null>(null);
  const [newFotoPassportBase64, setNewFotoPassportBase64] = useState<
    string | null
  >(null);
  const [isEditFormOpened, setIsEditFormOpened] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [invoiceOptions, setInvoiceOptions] = useState<
    { invoice: string; name: string }[]
  >([]);
  const [transaksiData, setTransaksiData] = useState<TransaksiData[]>([]);
  const [showEditInvoiceDropdown, setShowEditInvoiceDropdown] = useState(false);
  const [filteredEditInvoices, setFilteredEditInvoices] = useState<
    { invoice: string; name: string }[]
  >([]);
  const editInvoiceInputRef = useRef<HTMLInputElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Fungsi untuk mendapatkan tanggal keberangkatan terdekat
  const getNextDepartureDate = (): string | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time untuk perbandingan tanggal saja

    const futureDates = dataList
      .map((item) => {
        const date = parseDate(item.tanggal_keberangkatan);
        return date;
      })
      .filter((date): date is Date => date !== null && date >= today)
      .sort((a, b) => a.getTime() - b.getTime());

    if (futureDates.length === 0) return null;

    const nextDate = futureDates[0];
    return nextDate.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Fungsi untuk mendapatkan jumlah peserta pada tanggal keberangkatan terdekat
  const getNextDepartureParticipants = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDates = dataList
      .map((item) => {
        const date = parseDate(item.tanggal_keberangkatan);
        return { date, item };
      })
      .filter(
        (entry): entry is { date: Date; item: TravelData } =>
          entry.date !== null && entry.date >= today
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (futureDates.length === 0) return 0;

    const nextDate = futureDates[0].date;
    const nextDateString = nextDate.toISOString().split("T")[0]; // Format YYYY-MM-DD

    // Hitung jumlah peserta dengan tanggal keberangkatan yang sama
    const participantCount = dataList.filter((item) => {
      const itemDate = parseDate(item.tanggal_keberangkatan);
      if (!itemDate) return false;
      const itemDateString = itemDate.toISOString().split("T")[0];
      return itemDateString === nextDateString;
    }).length;

    return participantCount;
  };

  // Fungsi untuk mendapatkan nama paket tour pada tanggal keberangkatan terdekat
  const getNextDepartureTourPackage = (): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDates = dataList
      .map((item) => {
        const date = parseDate(item.tanggal_keberangkatan);
        return { date, item };
      })
      .filter(
        (entry): entry is { date: Date; item: TravelData } =>
          entry.date !== null && entry.date >= today
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (futureDates.length === 0) return "";

    return futureDates[0].item.paket_tour || "";
  };

  useEffect(() => {
    if (editData?.nomor_invoice) {
      const lowerQuery = editData.nomor_invoice.toLowerCase();
      const filtered = invoiceOptions.filter(
        (option) =>
          option.invoice.toLowerCase().includes(lowerQuery) || // ← DIEDIT: Filter berdasarkan invoice
          option.name.toLowerCase().includes(lowerQuery) // ← DITAMBAHKAN: Filter juga berdasarkan name
      );
      setFilteredEditInvoices(filtered);
    } else {
      setFilteredEditInvoices(invoiceOptions);
    }
  }, [editData?.nomor_invoice, invoiceOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editInvoiceInputRef.current &&
        !editInvoiceInputRef.current.contains(event.target as Node)
      ) {
        setShowEditInvoiceDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchData();
    fetchInvoiceOptions();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${ENDPOINT}?action=read&sheet=FormCostumer`,
        { mode: "cors" }
      );
      if (!response.ok) throw new Error("Gagal memuat data");
      const data = await response.json();
      setDataList(
        data.map((item: any) => ({
          ...item,
          id: item.nomor_passport.toString(),
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

  const fetchInvoiceOptions = async () => {
    try {
      const res = await fetch(`${ENDPOINT}?action=read&sheet=Transaksi`, {
        mode: "cors",
      });
      const data: TransaksiData[] = await res.json();
      // Ubah mapping: bukan hanya invoice, tapi object {invoice, name}
      const options = data
        .map((item) => ({
          invoice: item.nomor_invoice,
          name: item.nama || "Nama Tidak Tersedia", // ← DITAMBAHKAN: Ambil nama, fallback jika kosong
        }))
        .filter((opt) => opt.invoice); // Filter hanya yang punya invoice
      setInvoiceOptions(options); // ← DIEDIT: Set options sebagai array objects
      setTransaksiData(data); // Tetap simpan data full
    } catch (err) {
      console.error("Gagal memuat daftar invoice:", err);
    }
  };

  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    try {
      let date: Date | null = null;
      if (dateString.includes("T")) {
        date = new Date(dateString);
      } else {
        const parts = dateString.replace(/\//g, "-").split("-");
        if (parts.length === 3) {
          let day = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
          if (year < 100) year += 2000;
          if (parts[0].length === 4) {
            day = parseInt(parts[2], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[0], 10);
          }
          date = new Date(year, month - 1, day);
        } else {
          date = new Date(dateString);
        }
      }
      if (date && !isNaN(date.getTime())) {
        return date;
      }
      return null;
    } catch {
      return null;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = parseDate(dateString);
    if (!date) return dateString;
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const dateToComparable = (dateString: string): string => {
    if (!dateString) return "";
    const date = parseDate(dateString);
    if (!date) return "";
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const filteredData = dataList.filter((item) => {
    const nameMatch = item.nama
      .toLowerCase()
      .includes(searchName.toLowerCase());
    const itemTanggalDaftar = dateToComparable(item.tanggal_daftar);
    const itemTanggalKeberangkatan = dateToComparable(
      item.tanggal_keberangkatan
    );
    const daftarMatch =
      (!startDaftar || itemTanggalDaftar >= startDaftar) &&
      (!endDaftar || itemTanggalDaftar <= endDaftar);
    const keberangkatanMatch =
      !startKeberangkatan || itemTanggalKeberangkatan === startKeberangkatan;
    const paketMatch = !selectedPaket || item.paket_tour === selectedPaket;
    return nameMatch && daftarMatch && keberangkatanMatch && paketMatch;
  });

  const clearFilters = () => {
    setSearchName("");
    setStartDaftar("");
    setEndDaftar("");
    setStartKeberangkatan("");

    setSelectedPaket("");
  };

  const formatCurrency = (value: string) => {
    if (!value) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(Number(value));
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
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

  const calculatePeriod = (
    tanggalKeberangkatan: string,
    durasiTour: string
  ): string => {
    const date = parseDate(tanggalKeberangkatan);
    if (!date) return "Invalid Date";
    const dayMatch = durasiTour.match(/^(\d+)D/);
    const days = dayMatch ? parseInt(dayMatch[1], 10) : 1;
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + days - 1);
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "long",
      year: "numeric",
    };
    const startDateFormatted = date.toLocaleDateString("id-ID", options);
    const endDateFormatted = endDate.toLocaleDateString("id-ID", options);
    return `${startDateFormatted} - ${endDateFormatted}`;
  };

  const handleDownloadInvoice = () => {
    const selectedData = filteredData.filter((item) =>
      selectedIds.has(item.id)
    );
    if (selectedData.length === 0) {
      setMessage("Pilih setidaknya satu data untuk invoice");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    const totalBagasi = selectedData.reduce(
      (sum, item) => sum + (Number(item.bagasi) || 0),
      0
    );
    const pax = selectedData.length;
    const totalAmount = selectedData.reduce(
      (sum, item) => sum + Number(item.harga_paket),
      0
    );
    const grandTotal = totalAmount + totalBagasi;
    const pricePerPax = (totalAmount / pax).toFixed(0);
    const bagasiPerPax = totalBagasi > 0 ? (totalBagasi / pax).toFixed(0) : "0";
    const program =
      selectedData[0].paket_tour +
      "  " +
      selectedData[0].durasi_tour.replace("D ", "H").replace("N", "M");
    const tanggal = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const invoiceNo = "008";
    const terbilang = bilangRupiah(grandTotal) + " Rupiah";
    const doc = new jsPDF();
    doc.addImage("/logo_daeng_travel.png", "PNG", 10, 17, 40, 16);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CV. DAENG WISATA INDONESIA TOUR & TRAVEL", 105, 20, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.text("Call/WA: 085256 268 727", 105, 25, { align: "center" });
    doc.text("Email: daengwisataindonesia@gmail.com", 105, 30, {
      align: "center",
    });
    doc.text("Head Office: Perumahan Green House Alauddin, Makassar", 105, 35, {
      align: "center",
    });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(10, 40, 200, 40);
    doc.setFontSize(10);
    doc.text("Booking Konfirmasi:", 15, 60);
    doc.text(`Tanggal : ${tanggal}`, 15, 70);
    doc.text(`Invoice No : ${invoiceNo}`, 105, 70);
    doc.text("Nama : ", 15, 80);
    doc.text(`Peserta : ${pax} Pax`, 105, 80);
    doc.text(`Program : Tour ${program}`, 15, 90);
    const periode = calculatePeriod(
      selectedData[0].tanggal_keberangkatan,
      selectedData[0].durasi_tour
    );
    doc.text(`Periode : ${periode}`, 15, 100);
    const invoiceBody = [
      [
        "1",
        `Paket Tour ${program}`,
        formatNumber(pricePerPax),
        "1",
        String(pax),
        formatNumber(totalAmount.toString()),
      ],
    ];
    if (totalBagasi > 0) {
      invoiceBody.push([
        "2",
        "Biaya Bagasi",
        formatNumber(bagasiPerPax),
        "-",
        String(pax),
        formatNumber(totalBagasi.toString()),
      ]);
    }
    autoTable(doc, {
      startY: 110,
      head: [["No", "Description", "Price", "Pkg", "Pax", "Total"]],
      body: invoiceBody,
      foot: [["", "", "", "", "Total", formatNumber(grandTotal.toString())]],
      theme: "grid",
      styles: { fontSize: 10 },
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      body: [[`Says: ${terbilang}`]],
      theme: "grid",
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: "auto" } },
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      body: [
        ["DP1", ""],
        ["DP2", ""],
        ["Sisa", formatNumber(grandTotal.toString())],
      ],
      theme: "grid",
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 50 } },
    });
    let yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.text("NOTE: LUNAS", 15, yPos);
    doc.text(
      "Balance/Pelunasan paling lambat H-20 Keberangkatan",
      15,
      yPos + 10
    );
    yPos += 20;
    doc.text("BANK ACCOUNT", 15, yPos);
    yPos += 10;
    doc.text("BANK MANDIRI", 15, yPos);
    doc.text("Account No : 1810 0020 03748", 15, yPos + 5);
    doc.text("Beneficiary: MUHAMMAD AZHAR", 15, yPos + 10);
    yPos += 20;
    doc.text("BANK BCA", 15, yPos);
    doc.text("Account No : 7970 42 6064", 15, yPos + 5);
    doc.text("Beneficiary: MUHAMMAD AZHAR", 15, yPos + 10);
    yPos += 20;
    doc.text("BANK BRI", 15, yPos);
    doc.text("AccountNo.: 382401017088539", 15, yPos + 5);
    doc.text("Beneficiary: MUHAMMAD AZHAR", 15, yPos + 10);
    yPos += 20;
    doc.text("BANK BNI", 15, yPos);
    doc.text("Account No. : 0558 67 7534", 15, yPos + 5);
    doc.text("Beneficiary: MUHAMMAD AZHAR", 15, yPos + 10);
    doc.text("Account No. : 2410 61 2436", 15, yPos + 15);
    doc.text("Beneficiary: MUHAMMAD AZHAR", 15, yPos + 20);
    doc.text("Best Regards", 150, yPos + 30);
    doc.text("Daeng Travel", 150, yPos + 50);
    doc.save("invoice.pdf");
  };

  const formatNumber = (num: string) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const bilangRupiah = (angka: number): string => {
    const bilangan = [
      "",
      "Satu",
      "Dua",
      "Tiga",
      "Empat",
      "Lima",
      "Enam",
      "Tujuh",
      "Delapan",
      "Sembilan",
      "Sepuluh",
      "Sebelas",
    ];
    if (angka < 12) return bilangan[angka];
    if (angka < 20) return bilangRupiah(angka - 10) + " Belas";
    if (angka < 100)
      return (
        bilangRupiah(Math.floor(angka / 10)) +
        " Puluh" +
        (angka % 10 ? " " + bilangRupiah(angka % 10) : "")
      );
    if (angka < 200)
      return "Seratus" + (angka % 100 ? " " + bilangRupiah(angka % 100) : "");
    if (angka < 1000)
      return (
        bilangRupiah(Math.floor(angka / 100)) +
        " Ratus" +
        (angka % 100 ? " " + bilangRupiah(angka % 100) : "")
      );
    if (angka < 2000)
      return "Seribu" + (angka % 1000 ? " " + bilangRupiah(angka % 1000) : "");
    if (angka < 1000000)
      return (
        bilangRupiah(Math.floor(angka / 1000)) +
        " Ribu" +
        (angka % 1000 ? " " + bilangRupiah(angka % 1000) : "")
      );
    if (angka < 1000000000)
      return (
        bilangRupiah(Math.floor(angka / 1000000)) +
        " Juta" +
        (angka % 1000000 ? " " + bilangRupiah(angka % 1000000) : "")
      );
    return "";
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${ENDPOINT}?action=delete&passport=${encodeURIComponent(
          id
        )}&sheet=FormCostumer`,
        { method: "GET", mode: "cors" }
      );
      if (!response.ok) throw new Error("Gagal menghapus data");
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
    setEditData({
      ...item,
      tanggal_daftar: dateToComparable(item.tanggal_daftar),
      tanggal_lahir: dateToComparable(item.tanggal_lahir),
      masa_berlaku_passport: dateToComparable(item.masa_berlaku_passport),
      tanggal_keberangkatan: dateToComparable(item.tanggal_keberangkatan),
      harga_paket: String(item.harga_paket),
      bagasi: String(item.bagasi || ""),
      old_nomor_passport: item.nomor_passport,
    });
    setNewFotoPassportBase64(null);
    setIsEditFormOpened(true);
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (editData) {
      if (name === "harga_paket" || name === "bagasi") {
        const rawValue = value.replace(/\./g, "").replace(/\D/g, "");
        setEditData({ ...editData, [name]: rawValue });
      } else {
        setEditData({ ...editData, [name]: value });
      }
    }
  };

  const handleNewFotoPassportChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target)
          setNewFotoPassportBase64(event.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const validateEditForm = () => {
    if (!editData) return false;
    return (
      editData.nama &&
      editData.tanggal_daftar &&
      editData.tanggal_lahir &&
      editData.jenis_kelamin &&
      editData.nomor_passport
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
        old_nomor_passport:
          editData.old_nomor_passport || editData.nomor_passport,
        foto_passport: newFotoPassportBase64
          ? newFotoPassportBase64.split(",")[1]
          : null,
        sheet: "FormCostumer",
      };
      const response = await fetch(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(dataToSend),
        headers: { "Content-Type": "text/plain" },
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
                id: editData.nomor_passport,
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

  useEffect(() => {
    if (isEditFormOpened && editFormRef.current) {
      editFormRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setIsEditFormOpened(false);
    }
  }, [isEditFormOpened]);

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(filteredData.map((item) => item.id));
      setSelectedIds(allIds);
    }
  };

  const handleRowClick = (id: string) => {
    setSelectedRowId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {isLoading && (
        <>
          {/* Overlay untuk form area saja */}
          <div
            className="fixed bg-black bg-opacity-30 pointer-events-auto"
            style={{
              top: "200px", // Mulai dari bawah menu
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
            }}
          />
          {/* Loading indicator */}
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 40 }}
          >
            <div className="bg-white rounded-lg p-8 shadow-xl text-center mt-64">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-xl font-semibold text-gray-800">
                Mohon Tunggu...
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Sedang memuat data customer
              </p>
            </div>
          </div>
        </>
      )}
      <div className="max-w-6xl mx-auto">
        <div
          className="bg-white rounded-lg shadow-lg p-6 mb-6 text-center sticky top-0"
          style={{ zIndex: 50 }}
        >
          <div className="mb-4">
            <img
              src="/logo_daeng_travel.png"
              alt="Logo Aplikasi"
              className="mx-auto h-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Data Customer
          </h1>
          <p className="text-gray-600">Daftar data dari sheet FormCostumer</p>
          <div className="mt-4 flex justify-center space-x-4">
            <Link to="/" className="text-blue-600 hover:underline">
              Form Perjalanan
            </Link>
            <Link to="/data-customer" className="text-blue-600 hover:underline">
              Data Customer
            </Link>
            <Link to="/transaksi" className="text-blue-600 hover:underline">
              Transaksi
            </Link>
          </div>
        </div>

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

        {/* Info Tanggal Keberangkatan Terdekat */}
        {getNextDepartureDate() && (
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-4 mb-6 text-white">
            <div className="flex flex-col space-y-4">
              {/* Header */}
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                  <Calendar size={24} />
                </div>
                <h3 className="text-base font-semibold">
                  Keberangkatan Selanjutnya
                </h3>
              </div>

              {/* Tanggal Keberangkatan */}
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <p className="text-xs opacity-75 mb-1">Tanggal</p>
                <p className="text-lg font-bold leading-tight">
                  {getNextDepartureDate()}
                </p>
              </div>

              {/* Info Grid - Paket & Peserta */}
              <div className="grid grid-cols-2 gap-3">
                {/* Paket Tour */}
                {getNextDepartureTourPackage() && (
                  <div className="bg-white bg-opacity-10 rounded-lg p-3">
                    <div className="flex items-center mb-1">
                      <Package size={14} className="mr-1 opacity-75" />
                      <p className="text-xs opacity-75">Paket Tour</p>
                    </div>
                    <p className="text-sm font-semibold leading-tight">
                      {getNextDepartureTourPackage()}
                    </p>
                  </div>
                )}

                {/* Jumlah Peserta */}
                <div className="bg-white bg-opacity-10 rounded-lg p-3">
                  <div className="flex items-center mb-1">
                    <User size={14} className="mr-1 opacity-75" />
                    <p className="text-xs opacity-75">Peserta</p>
                  </div>
                  <div className="flex items-baseline">
                    <p className="text-3xl font-bold mr-1">
                      {getNextDepartureParticipants()}
                    </p>
                    <p className="text-xs opacity-75">Orang</p>
                  </div>
                </div>
              </div>

              {/* ← BAGIAN BARU: Tombol Filter */}
              <button
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const futureDates = dataList
                    .map((item) => {
                      const date = parseDate(item.tanggal_keberangkatan);
                      return date;
                    })
                    .filter(
                      (date): date is Date => date !== null && date >= today
                    )
                    .sort((a, b) => a.getTime() - b.getTime());

                  if (futureDates.length > 0) {
                    const nextDate = futureDates[0];
                    const year = nextDate.getFullYear();
                    const month = (nextDate.getMonth() + 1)
                      .toString()
                      .padStart(2, "0");
                    const day = nextDate.getDate().toString().padStart(2, "0");
                    const isoDate = `${year}-${month}-${day}`;
                    setStartKeberangkatan(isoDate);
                    setTimeout(() => {
                      if (tableRef.current) {
                        tableRef.current.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }
                    }, 100);
                  }
                }}
                className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Calendar size={16} />
                <span>Tampilkan Data Keberangkatan Ini</span>
              </button>
            </div>
          </div>
        )}

        {/* Jika tidak ada tanggal keberangkatan */}
        {!getNextDepartureDate() && (
          <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 mb-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="bg-gray-200 rounded-lg p-3">
                <Calendar className="text-gray-400" size={32} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">
                  Keberangkatan Selanjutnya
                </h3>
                <p className="text-sm text-gray-600">
                  Tidak ada jadwal keberangkatan mendatang
                </p>
              </div>
            </div>
          </div>
        )}

        {editData && (
          <div
            ref={editFormRef}
            className="bg-white rounded-lg shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Edit className="mr-2" size={24} /> Edit Data
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <User size={16} className="mr-1" /> Nama
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
              <div className="relative" ref={editInvoiceInputRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FileText size={16} className="mr-1" /> Nomor Invoice
                </label>
                <input
                  type="text"
                  name="nomor_invoice"
                  value={editData.nomor_invoice || ""}
                  onChange={handleEditInputChange}
                  onFocus={() => setShowEditInvoiceDropdown(true)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ketik atau pilih nomor invoice"
                  autoComplete="off"
                />
                {showEditInvoiceDropdown && filteredEditInvoices.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredEditInvoices.map(
                      (
                        option // ← DIEDIT: option sekarang object
                      ) => (
                        <div
                          key={option.invoice} // ← DIEDIT: Key berdasarkan invoice unik
                          onClick={() => {
                            setEditData(
                              (prev) =>
                                prev
                                  ? { ...prev, nomor_invoice: option.invoice }
                                  : null // ← DIEDIT: Set hanya invoice ke formData
                            );
                            setShowEditInvoiceDropdown(false);
                          }}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        >
                          {option.invoice} - {option.name}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" /> Tanggal Daftar
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
                  <Calendar size={16} className="mr-1" /> Tanggal Lahir
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
                  <FileText size={16} className="mr-1" /> Nomor Passport
                </label>
                <input
                  type="text"
                  name="nomor_passport"
                  value={editData.nomor_passport}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan nomor passport"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" /> Masa Berlaku Passport
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
                  <MapPin size={16} className="mr-1" /> Jenis Trip
                </label>
                <select
                  name="jenis_trip"
                  value={editData.jenis_trip}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Jenis Trip</option>
                  <option value="Konsorsium">Konsorsium</option>
                  <option value="Open Trip">Open Trip</option>
                  <option value="Family Trip">Family Trip</option>
                  <option value="Group Trip">Group Trip</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Package size={16} className="mr-1" /> Paket Tour
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
                  <Clock size={16} className="mr-1" /> Durasi Tour
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
                  <DollarSign size={16} className="mr-1" /> Harga Paket
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
                  <Package size={16} className="mr-1" /> Harga Bagasi (Opsional)
                </label>
                <input
                  type="text"
                  name="bagasi"
                  value={formatInputNumber(editData.bagasi)}
                  onChange={handleEditInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contoh: 300000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar size={16} className="mr-1" /> Tanggal Keberangkatan
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
                  <Image size={16} className="mr-1" /> Ganti Foto Passport
                  (opsional)
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
                  <Save className="mr-2" size={20} />{" "}
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
                Tanggal Keberangkatan
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
            <button
              onClick={handleDownloadInvoice}
              className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
              disabled={filteredData.length === 0}
            >
              Download Invoice
            </button>
          </div>
        </div>

        <div ref={tableRef} className="bg-white rounded-lg shadow-lg p-6">
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
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredData.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nomor Invoice
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
                      Harga Bagasi
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
                  {filteredData.map((item, index) => {
                    const matchingTransaksi = transaksiData.find(
                      (t) => t.nomor_invoice === item.nomor_invoice
                    );
                    const isLunas =
                      matchingTransaksi?.status_pembayaran === "Lunas";
                    return (
                      <tr
                        key={item.id}
                        className={`${isLunas ? "bg-green-100" : ""} ${
                          selectedRowId === item.id
                            ? "bg-blue-100 shadow-md cursor-pointer"
                            : ""
                        }`} // ← DIEDIT: Tambah class conditional untuk highlight dan shadow
                        onClick={() => handleRowClick(item.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => handleSelect(item.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.nama}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.nomor_invoice || "-"}
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
                          {item.bagasi ? formatCurrency(item.bagasi) : "-"}
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
                    );
                  })}
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
      <Route path="/transaksi" element={<TransaksiPage />} />
    </Routes>
  </Router>
);
export default App;
