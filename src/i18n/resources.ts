// Translation catalog. Add a new language by adding an entry to `languages`
// and a matching block in `resources` using the same keys as `en`.

export type LanguageMeta = { code: string; label: string; dir: "ltr" | "rtl" };

export const languages: LanguageMeta[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "pt", label: "Português", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "it", label: "Italiano", dir: "ltr" },
  { code: "nl", label: "Nederlands", dir: "ltr" },
  { code: "pl", label: "Polski", dir: "ltr" },
  { code: "ru", label: "Русский", dir: "ltr" },
  { code: "tr", label: "Türkçe", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "ur", label: "اردو", dir: "rtl" },
  { code: "hi", label: "हिन्दी", dir: "ltr" },
  { code: "bn", label: "বাংলা", dir: "ltr" },
  { code: "id", label: "Bahasa Indonesia", dir: "ltr" },
  { code: "vi", label: "Tiếng Việt", dir: "ltr" },
  { code: "th", label: "ไทย", dir: "ltr" },
  { code: "ja", label: "日本語", dir: "ltr" },
  { code: "ko", label: "한국어", dir: "ltr" },
  { code: "zh", label: "中文", dir: "ltr" },
];

const en = {
  nav: {
    home: "Home",
    earn: "Earn",
    withdraw: "Withdraw",
    profile: "Profile",
    admin: "Admin",
    menu: "Menu",
    openMenu: "Open menu",
    notifications: "Notifications",
    signOut: "Sign out",
    balance: "Balance",
    skip: "Skip to main content",
  },
  common: {
    loading: "Loading...",
    language: "Language",
    save: "Save",
    cancel: "Cancel",
    continueLabel: "Continue",
    back: "Back",
  },
  auth: {
    signIn: "Sign in",
    signUp: "Sign up",
    email: "Email",
    password: "Password",
    forgot: "Forgot password?",
    google: "Continue with Google",
    welcome: "Welcome back",
    create: "Create your account",
  },
  earn: {
    title: "Available surveys",
    subtitle: "Matched to your profile",
    start: "Start survey",
    reward: "Reward",
    minutes: "min",
  },
  withdraw: {
    title: "Withdraw",
    method: "Payout method",
    destination: "Destination",
    amount: "Amount (coins)",
    request: "Request withdrawal",
    minimum: "Minimum {{count}} coins",
    history: "Withdrawal history",
  },
};

export type Translation = typeof en;

const t = (o: Translation) => o;

export const resources: Record<string, { translation: Translation }> = {
  en: { translation: en },
  es: {
    translation: t({
      nav: { home: "Inicio", earn: "Ganar", withdraw: "Retirar", profile: "Perfil", admin: "Administración", menu: "Menú", openMenu: "Abrir menú", notifications: "Notificaciones", signOut: "Cerrar sesión", balance: "Saldo", skip: "Ir al contenido principal" },
      common: { loading: "Cargando...", language: "Idioma", save: "Guardar", cancel: "Cancelar", continueLabel: "Continuar", back: "Atrás" },
      auth: { signIn: "Iniciar sesión", signUp: "Registrarse", email: "Correo electrónico", password: "Contraseña", forgot: "¿Olvidaste tu contraseña?", google: "Continuar con Google", welcome: "Bienvenido de nuevo", create: "Crea tu cuenta" },
      earn: { title: "Encuestas disponibles", subtitle: "Según tu perfil", start: "Comenzar encuesta", reward: "Recompensa", minutes: "min" },
      withdraw: { title: "Retirar", method: "Método de pago", destination: "Destino", amount: "Cantidad (monedas)", request: "Solicitar retiro", minimum: "Mínimo {{count}} monedas", history: "Historial de retiros" },
    }),
  },
  pt: {
    translation: t({
      nav: { home: "Início", earn: "Ganhar", withdraw: "Sacar", profile: "Perfil", admin: "Administração", menu: "Menu", openMenu: "Abrir menu", notifications: "Notificações", signOut: "Sair", balance: "Saldo", skip: "Ir para o conteúdo principal" },
      common: { loading: "Carregando...", language: "Idioma", save: "Salvar", cancel: "Cancelar", continueLabel: "Continuar", back: "Voltar" },
      auth: { signIn: "Entrar", signUp: "Criar conta", email: "E-mail", password: "Senha", forgot: "Esqueceu a senha?", google: "Continuar com Google", welcome: "Bem-vindo de volta", create: "Crie sua conta" },
      earn: { title: "Pesquisas disponíveis", subtitle: "Compatíveis com seu perfil", start: "Iniciar pesquisa", reward: "Recompensa", minutes: "min" },
      withdraw: { title: "Sacar", method: "Forma de pagamento", destination: "Destino", amount: "Valor (moedas)", request: "Solicitar saque", minimum: "Mínimo de {{count}} moedas", history: "Histórico de saques" },
    }),
  },
  fr: {
    translation: t({
      nav: { home: "Accueil", earn: "Gagner", withdraw: "Retirer", profile: "Profil", admin: "Administration", menu: "Menu", openMenu: "Ouvrir le menu", notifications: "Notifications", signOut: "Se déconnecter", balance: "Solde", skip: "Aller au contenu principal" },
      common: { loading: "Chargement...", language: "Langue", save: "Enregistrer", cancel: "Annuler", continueLabel: "Continuer", back: "Retour" },
      auth: { signIn: "Se connecter", signUp: "S'inscrire", email: "E-mail", password: "Mot de passe", forgot: "Mot de passe oublié ?", google: "Continuer avec Google", welcome: "Bon retour", create: "Créez votre compte" },
      earn: { title: "Sondages disponibles", subtitle: "Adaptés à votre profil", start: "Commencer le sondage", reward: "Récompense", minutes: "min" },
      withdraw: { title: "Retrait", method: "Mode de paiement", destination: "Destination", amount: "Montant (pièces)", request: "Demander un retrait", minimum: "Minimum {{count}} pièces", history: "Historique des retraits" },
    }),
  },
  de: {
    translation: t({
      nav: { home: "Start", earn: "Verdienen", withdraw: "Auszahlen", profile: "Profil", admin: "Verwaltung", menu: "Menü", openMenu: "Menü öffnen", notifications: "Benachrichtigungen", signOut: "Abmelden", balance: "Guthaben", skip: "Zum Hauptinhalt springen" },
      common: { loading: "Wird geladen...", language: "Sprache", save: "Speichern", cancel: "Abbrechen", continueLabel: "Weiter", back: "Zurück" },
      auth: { signIn: "Anmelden", signUp: "Registrieren", email: "E-Mail", password: "Passwort", forgot: "Passwort vergessen?", google: "Weiter mit Google", welcome: "Willkommen zurück", create: "Konto erstellen" },
      earn: { title: "Verfügbare Umfragen", subtitle: "Passend zu deinem Profil", start: "Umfrage starten", reward: "Belohnung", minutes: "Min." },
      withdraw: { title: "Auszahlung", method: "Auszahlungsmethode", destination: "Empfänger", amount: "Betrag (Coins)", request: "Auszahlung anfordern", minimum: "Mindestens {{count}} Coins", history: "Auszahlungsverlauf" },
    }),
  },
  it: {
    translation: t({
      nav: { home: "Home", earn: "Guadagna", withdraw: "Preleva", profile: "Profilo", admin: "Amministrazione", menu: "Menu", openMenu: "Apri menu", notifications: "Notifiche", signOut: "Esci", balance: "Saldo", skip: "Vai al contenuto principale" },
      common: { loading: "Caricamento...", language: "Lingua", save: "Salva", cancel: "Annulla", continueLabel: "Continua", back: "Indietro" },
      auth: { signIn: "Accedi", signUp: "Registrati", email: "Email", password: "Password", forgot: "Password dimenticata?", google: "Continua con Google", welcome: "Bentornato", create: "Crea il tuo account" },
      earn: { title: "Sondaggi disponibili", subtitle: "In base al tuo profilo", start: "Inizia sondaggio", reward: "Ricompensa", minutes: "min" },
      withdraw: { title: "Prelievo", method: "Metodo di pagamento", destination: "Destinazione", amount: "Importo (monete)", request: "Richiedi prelievo", minimum: "Minimo {{count}} monete", history: "Storico prelievi" },
    }),
  },
  nl: {
    translation: t({
      nav: { home: "Start", earn: "Verdienen", withdraw: "Uitbetalen", profile: "Profiel", admin: "Beheer", menu: "Menu", openMenu: "Menu openen", notifications: "Meldingen", signOut: "Uitloggen", balance: "Saldo", skip: "Ga naar hoofdinhoud" },
      common: { loading: "Laden...", language: "Taal", save: "Opslaan", cancel: "Annuleren", continueLabel: "Doorgaan", back: "Terug" },
      auth: { signIn: "Inloggen", signUp: "Registreren", email: "E-mail", password: "Wachtwoord", forgot: "Wachtwoord vergeten?", google: "Doorgaan met Google", welcome: "Welkom terug", create: "Maak je account" },
      earn: { title: "Beschikbare enquêtes", subtitle: "Passend bij je profiel", start: "Enquête starten", reward: "Beloning", minutes: "min" },
      withdraw: { title: "Uitbetaling", method: "Uitbetaalmethode", destination: "Bestemming", amount: "Bedrag (munten)", request: "Uitbetaling aanvragen", minimum: "Minimaal {{count}} munten", history: "Uitbetalingsgeschiedenis" },
    }),
  },
  pl: {
    translation: t({
      nav: { home: "Start", earn: "Zarabiaj", withdraw: "Wypłata", profile: "Profil", admin: "Administracja", menu: "Menu", openMenu: "Otwórz menu", notifications: "Powiadomienia", signOut: "Wyloguj", balance: "Saldo", skip: "Przejdź do treści głównej" },
      common: { loading: "Ładowanie...", language: "Język", save: "Zapisz", cancel: "Anuluj", continueLabel: "Dalej", back: "Wstecz" },
      auth: { signIn: "Zaloguj się", signUp: "Zarejestruj się", email: "E-mail", password: "Hasło", forgot: "Nie pamiętasz hasła?", google: "Kontynuuj z Google", welcome: "Witaj ponownie", create: "Załóż konto" },
      earn: { title: "Dostępne ankiety", subtitle: "Dopasowane do Twojego profilu", start: "Rozpocznij ankietę", reward: "Nagroda", minutes: "min" },
      withdraw: { title: "Wypłata", method: "Metoda wypłaty", destination: "Odbiorca", amount: "Kwota (monety)", request: "Zleć wypłatę", minimum: "Minimum {{count}} monet", history: "Historia wypłat" },
    }),
  },
  ru: {
    translation: t({
      nav: { home: "Главная", earn: "Заработок", withdraw: "Вывод", profile: "Профиль", admin: "Админ-панель", menu: "Меню", openMenu: "Открыть меню", notifications: "Уведомления", signOut: "Выйти", balance: "Баланс", skip: "Перейти к основному содержимому" },
      common: { loading: "Загрузка...", language: "Язык", save: "Сохранить", cancel: "Отмена", continueLabel: "Продолжить", back: "Назад" },
      auth: { signIn: "Войти", signUp: "Регистрация", email: "Эл. почта", password: "Пароль", forgot: "Забыли пароль?", google: "Продолжить с Google", welcome: "С возвращением", create: "Создайте аккаунт" },
      earn: { title: "Доступные опросы", subtitle: "Подобраны по вашему профилю", start: "Начать опрос", reward: "Награда", minutes: "мин" },
      withdraw: { title: "Вывод средств", method: "Способ выплаты", destination: "Реквизиты", amount: "Сумма (монеты)", request: "Запросить вывод", minimum: "Минимум {{count}} монет", history: "История выплат" },
    }),
  },
  tr: {
    translation: t({
      nav: { home: "Ana sayfa", earn: "Kazan", withdraw: "Para çek", profile: "Profil", admin: "Yönetim", menu: "Menü", openMenu: "Menüyü aç", notifications: "Bildirimler", signOut: "Çıkış yap", balance: "Bakiye", skip: "Ana içeriğe geç" },
      common: { loading: "Yükleniyor...", language: "Dil", save: "Kaydet", cancel: "İptal", continueLabel: "Devam", back: "Geri" },
      auth: { signIn: "Giriş yap", signUp: "Kayıt ol", email: "E-posta", password: "Şifre", forgot: "Şifreni mi unuttun?", google: "Google ile devam et", welcome: "Tekrar hoş geldin", create: "Hesabını oluştur" },
      earn: { title: "Mevcut anketler", subtitle: "Profiline uygun", start: "Ankete başla", reward: "Ödül", minutes: "dk" },
      withdraw: { title: "Para çekme", method: "Ödeme yöntemi", destination: "Hesap bilgisi", amount: "Tutar (jeton)", request: "Ödeme talep et", minimum: "En az {{count}} jeton", history: "Ödeme geçmişi" },
    }),
  },
  ar: {
    translation: t({
      nav: { home: "الرئيسية", earn: "اكسب", withdraw: "سحب", profile: "الملف الشخصي", admin: "الإدارة", menu: "القائمة", openMenu: "فتح القائمة", notifications: "الإشعارات", signOut: "تسجيل الخروج", balance: "الرصيد", skip: "تخطَّ إلى المحتوى الرئيسي" },
      common: { loading: "جارٍ التحميل...", language: "اللغة", save: "حفظ", cancel: "إلغاء", continueLabel: "متابعة", back: "رجوع" },
      auth: { signIn: "تسجيل الدخول", signUp: "إنشاء حساب", email: "البريد الإلكتروني", password: "كلمة المرور", forgot: "نسيت كلمة المرور؟", google: "المتابعة عبر Google", welcome: "مرحبًا بعودتك", create: "أنشئ حسابك" },
      earn: { title: "الاستبيانات المتاحة", subtitle: "مطابقة لملفك الشخصي", start: "ابدأ الاستبيان", reward: "المكافأة", minutes: "دقيقة" },
      withdraw: { title: "سحب الأرباح", method: "طريقة الدفع", destination: "وجهة الدفع", amount: "المبلغ (عملات)", request: "طلب السحب", minimum: "الحد الأدنى {{count}} عملة", history: "سجل السحوبات" },
    }),
  },
  ur: {
    translation: t({
      nav: { home: "ہوم", earn: "کمائیں", withdraw: "رقم نکالیں", profile: "پروفائل", admin: "ایڈمن", menu: "مینو", openMenu: "مینو کھولیں", notifications: "اطلاعات", signOut: "سائن آؤٹ", balance: "بیلنس", skip: "مرکزی مواد پر جائیں" },
      common: { loading: "لوڈ ہو رہا ہے...", language: "زبان", save: "محفوظ کریں", cancel: "منسوخ کریں", continueLabel: "جاری رکھیں", back: "واپس" },
      auth: { signIn: "سائن اِن", signUp: "اکاؤنٹ بنائیں", email: "ای میل", password: "پاس ورڈ", forgot: "پاس ورڈ بھول گئے؟", google: "Google کے ساتھ جاری رکھیں", welcome: "خوش آمدید", create: "اپنا اکاؤنٹ بنائیں" },
      earn: { title: "دستیاب سروے", subtitle: "آپ کی پروفائل کے مطابق", start: "سروے شروع کریں", reward: "انعام", minutes: "منٹ" },
      withdraw: { title: "رقم نکالیں", method: "ادائیگی کا طریقہ", destination: "ادائیگی کی تفصیل", amount: "رقم (سکے)", request: "درخواست بھیجیں", minimum: "کم از کم {{count}} سکے", history: "ادائیگیوں کی تاریخ" },
    }),
  },
  hi: {
    translation: t({
      nav: { home: "होम", earn: "कमाएँ", withdraw: "निकासी", profile: "प्रोफ़ाइल", admin: "एडमिन", menu: "मेन्यू", openMenu: "मेन्यू खोलें", notifications: "सूचनाएँ", signOut: "साइन आउट", balance: "बैलेंस", skip: "मुख्य सामग्री पर जाएँ" },
      common: { loading: "लोड हो रहा है...", language: "भाषा", save: "सहेजें", cancel: "रद्द करें", continueLabel: "जारी रखें", back: "वापस" },
      auth: { signIn: "साइन इन", signUp: "साइन अप", email: "ईमेल", password: "पासवर्ड", forgot: "पासवर्ड भूल गए?", google: "Google से जारी रखें", welcome: "फिर से स्वागत है", create: "अपना खाता बनाएँ" },
      earn: { title: "उपलब्ध सर्वे", subtitle: "आपकी प्रोफ़ाइल के अनुसार", start: "सर्वे शुरू करें", reward: "इनाम", minutes: "मिनट" },
      withdraw: { title: "निकासी", method: "भुगतान का तरीका", destination: "भुगतान विवरण", amount: "राशि (कॉइन)", request: "निकासी का अनुरोध करें", minimum: "न्यूनतम {{count}} कॉइन", history: "निकासी इतिहास" },
    }),
  },
  bn: {
    translation: t({
      nav: { home: "হোম", earn: "আয় করুন", withdraw: "উত্তোলন", profile: "প্রোফাইল", admin: "অ্যাডমিন", menu: "মেনু", openMenu: "মেনু খুলুন", notifications: "বিজ্ঞপ্তি", signOut: "সাইন আউট", balance: "ব্যালেন্স", skip: "মূল কনটেন্টে যান" },
      common: { loading: "লোড হচ্ছে...", language: "ভাষা", save: "সংরক্ষণ", cancel: "বাতিল", continueLabel: "চালিয়ে যান", back: "পেছনে" },
      auth: { signIn: "সাইন ইন", signUp: "সাইন আপ", email: "ইমেইল", password: "পাসওয়ার্ড", forgot: "পাসওয়ার্ড ভুলে গেছেন?", google: "Google দিয়ে চালিয়ে যান", welcome: "আবার স্বাগতম", create: "আপনার অ্যাকাউন্ট তৈরি করুন" },
      earn: { title: "উপলব্ধ জরিপ", subtitle: "আপনার প্রোফাইল অনুযায়ী", start: "জরিপ শুরু করুন", reward: "পুরস্কার", minutes: "মিনিট" },
      withdraw: { title: "উত্তোলন", method: "পেমেন্ট পদ্ধতি", destination: "পেমেন্ট ঠিকানা", amount: "পরিমাণ (কয়েন)", request: "উত্তোলনের অনুরোধ", minimum: "সর্বনিম্ন {{count}} কয়েন", history: "উত্তোলনের ইতিহাস" },
    }),
  },
  id: {
    translation: t({
      nav: { home: "Beranda", earn: "Hasilkan", withdraw: "Tarik dana", profile: "Profil", admin: "Admin", menu: "Menu", openMenu: "Buka menu", notifications: "Notifikasi", signOut: "Keluar", balance: "Saldo", skip: "Lewati ke konten utama" },
      common: { loading: "Memuat...", language: "Bahasa", save: "Simpan", cancel: "Batal", continueLabel: "Lanjut", back: "Kembali" },
      auth: { signIn: "Masuk", signUp: "Daftar", email: "Email", password: "Kata sandi", forgot: "Lupa kata sandi?", google: "Lanjutkan dengan Google", welcome: "Selamat datang kembali", create: "Buat akun Anda" },
      earn: { title: "Survei tersedia", subtitle: "Sesuai profil Anda", start: "Mulai survei", reward: "Imbalan", minutes: "mnt" },
      withdraw: { title: "Penarikan", method: "Metode pembayaran", destination: "Tujuan pembayaran", amount: "Jumlah (koin)", request: "Ajukan penarikan", minimum: "Minimal {{count}} koin", history: "Riwayat penarikan" },
    }),
  },
  vi: {
    translation: t({
      nav: { home: "Trang chủ", earn: "Kiếm tiền", withdraw: "Rút tiền", profile: "Hồ sơ", admin: "Quản trị", menu: "Menu", openMenu: "Mở menu", notifications: "Thông báo", signOut: "Đăng xuất", balance: "Số dư", skip: "Chuyển đến nội dung chính" },
      common: { loading: "Đang tải...", language: "Ngôn ngữ", save: "Lưu", cancel: "Hủy", continueLabel: "Tiếp tục", back: "Quay lại" },
      auth: { signIn: "Đăng nhập", signUp: "Đăng ký", email: "Email", password: "Mật khẩu", forgot: "Quên mật khẩu?", google: "Tiếp tục với Google", welcome: "Chào mừng trở lại", create: "Tạo tài khoản" },
      earn: { title: "Khảo sát hiện có", subtitle: "Phù hợp với hồ sơ của bạn", start: "Bắt đầu khảo sát", reward: "Phần thưởng", minutes: "phút" },
      withdraw: { title: "Rút tiền", method: "Phương thức thanh toán", destination: "Thông tin nhận tiền", amount: "Số lượng (xu)", request: "Yêu cầu rút tiền", minimum: "Tối thiểu {{count}} xu", history: "Lịch sử rút tiền" },
    }),
  },
  th: {
    translation: t({
      nav: { home: "หน้าแรก", earn: "หารายได้", withdraw: "ถอนเงิน", profile: "โปรไฟล์", admin: "ผู้ดูแลระบบ", menu: "เมนู", openMenu: "เปิดเมนู", notifications: "การแจ้งเตือน", signOut: "ออกจากระบบ", balance: "ยอดคงเหลือ", skip: "ข้ามไปยังเนื้อหาหลัก" },
      common: { loading: "กำลังโหลด...", language: "ภาษา", save: "บันทึก", cancel: "ยกเลิก", continueLabel: "ดำเนินการต่อ", back: "ย้อนกลับ" },
      auth: { signIn: "เข้าสู่ระบบ", signUp: "สมัครสมาชิก", email: "อีเมล", password: "รหัสผ่าน", forgot: "ลืมรหัสผ่าน?", google: "ดำเนินการต่อด้วย Google", welcome: "ยินดีต้อนรับกลับมา", create: "สร้างบัญชีของคุณ" },
      earn: { title: "แบบสอบถามที่มีอยู่", subtitle: "ตรงกับโปรไฟล์ของคุณ", start: "เริ่มทำแบบสอบถาม", reward: "รางวัล", minutes: "นาที" },
      withdraw: { title: "ถอนเงิน", method: "วิธีรับเงิน", destination: "ปลายทางการจ่ายเงิน", amount: "จำนวน (เหรียญ)", request: "ขอถอนเงิน", minimum: "ขั้นต่ำ {{count}} เหรียญ", history: "ประวัติการถอนเงิน" },
    }),
  },
  ja: {
    translation: t({
      nav: { home: "ホーム", earn: "報酬を得る", withdraw: "出金", profile: "プロフィール", admin: "管理", menu: "メニュー", openMenu: "メニューを開く", notifications: "通知", signOut: "ログアウト", balance: "残高", skip: "メインコンテンツへスキップ" },
      common: { loading: "読み込み中...", language: "言語", save: "保存", cancel: "キャンセル", continueLabel: "続行", back: "戻る" },
      auth: { signIn: "ログイン", signUp: "新規登録", email: "メールアドレス", password: "パスワード", forgot: "パスワードをお忘れですか？", google: "Google で続行", welcome: "おかえりなさい", create: "アカウントを作成" },
      earn: { title: "利用可能なアンケート", subtitle: "あなたのプロフィールに合わせて表示", start: "アンケートを開始", reward: "報酬", minutes: "分" },
      withdraw: { title: "出金", method: "支払い方法", destination: "受取先", amount: "金額（コイン）", request: "出金をリクエスト", minimum: "最低 {{count}} コイン", history: "出金履歴" },
    }),
  },
  ko: {
    translation: t({
      nav: { home: "홈", earn: "적립", withdraw: "출금", profile: "프로필", admin: "관리자", menu: "메뉴", openMenu: "메뉴 열기", notifications: "알림", signOut: "로그아웃", balance: "잔액", skip: "본문으로 건너뛰기" },
      common: { loading: "불러오는 중...", language: "언어", save: "저장", cancel: "취소", continueLabel: "계속", back: "뒤로" },
      auth: { signIn: "로그인", signUp: "회원가입", email: "이메일", password: "비밀번호", forgot: "비밀번호를 잊으셨나요?", google: "Google로 계속하기", welcome: "다시 오신 것을 환영합니다", create: "계정 만들기" },
      earn: { title: "이용 가능한 설문", subtitle: "프로필에 맞춘 추천", start: "설문 시작", reward: "보상", minutes: "분" },
      withdraw: { title: "출금", method: "지급 방법", destination: "지급 정보", amount: "금액(코인)", request: "출금 요청", minimum: "최소 {{count}} 코인", history: "출금 내역" },
    }),
  },
  zh: {
    translation: t({
      nav: { home: "首页", earn: "赚取", withdraw: "提现", profile: "个人资料", admin: "管理后台", menu: "菜单", openMenu: "打开菜单", notifications: "通知", signOut: "退出登录", balance: "余额", skip: "跳转到主要内容" },
      common: { loading: "加载中...", language: "语言", save: "保存", cancel: "取消", continueLabel: "继续", back: "返回" },
      auth: { signIn: "登录", signUp: "注册", email: "邮箱", password: "密码", forgot: "忘记密码？", google: "使用 Google 继续", welcome: "欢迎回来", create: "创建你的账户" },
      earn: { title: "可参与的问卷", subtitle: "根据你的资料匹配", start: "开始问卷", reward: "奖励", minutes: "分钟" },
      withdraw: { title: "提现", method: "收款方式", destination: "收款账户", amount: "金额（金币）", request: "申请提现", minimum: "最低 {{count}} 金币", history: "提现记录" },
    }),
  },
};
