import React, { useState } from 'react';
import { MailIcon, WhatsAppIcon, XCircleIcon } from './icons';

interface InfoModalProps {
  onClose: () => void;
}

const FAQContent: React.FC = () => (
  <div className="space-y-6">
    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Frequently Asked Questions</h3>

    <div>
      <h4 className="font-semibold">1. What is Soma – Study Partner?</h4>
      <p>Soma is an innovative study companion built to enhance learning, research, and academic productivity. It helps students organize study materials, access learning resources, and test their knowledge through interactive assessments.</p>
    </div>

    <div>
      <h4 className="font-semibold">2. Who developed Soma?</h4>
      <p>Soma – Study Partner was created and developed by Adeoye Opeyemi, a passionate software engineer and UI/UX designer dedicated to using technology to promote education and personal development.</p>
      <div className="flex items-center gap-4 mt-2">
        <a href="mailto:adeoyeopeyemi951@gmail.com" className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
          <MailIcon className="h-4 w-4" /> adeoyeopeyemi951@gmail.com
        </a>
        <a href="https://wa.me/2348124068599" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
          <WhatsAppIcon className="h-4 w-4" /> +234 812 406 8599
        </a>
      </div>
    </div>

    <div>
      <h4 className="font-semibold">3. What is Soma used for?</h4>
      <p>Soma is strictly designed for educational and academic purposes only. It is not intended for any form of malicious or unethical activity, the spread of false information, or non-academic or harmful usage.</p>
      {/* <p className="mt-2 italic text-slate-500 dark:text-slate-400">“Wisdom is the principal thing; therefore get wisdom” — Proverbs 4:7</p> */}
    </div>

    <div>
      <h4 className="font-semibold">4. Is my data safe on Soma?</h4>
      <p>Absolutely. Soma prioritizes your privacy and data protection. Your personal information and study data are securely encrypted. We do not sell or share your data with third parties. You remain in full control of your account and data at all times.</p>
    </div>

    <div>
      <h4 className="font-semibold">5. How reliable is Soma?</h4>
      <p>Soma is built with reliability and performance as top priorities. It receives continuous updates, supports online use, and undergoes rigorous testing to ensure stability and accuracy.</p>
    </div>

    <div>
      <h4 className="font-semibold">6. Can I share Soma with others?</h4>
      <p>Yes, you are encouraged to share Soma with friends and classmates, as long as it’s used for educational growth and not for exploitative, unethical, or harmful purposes.</p>
    </div>

    <div>
      <h4 className="font-semibold">7. How can I contact the developer?</h4>
      <p>You can reach out to Adeoye Opeyemi via email or WhatsApp for support, collaborations, or feature suggestions.</p>
    </div>

    <div>
      <h4 className="font-semibold">8. Is Soma open-source or free to use?</h4>
      <p>Currently, Soma is free for educational use. Future versions may include premium features, but the foundational purpose will always remain education-first.</p>
    </div>

    <div>
      <h4 className="font-semibold">9. What makes Soma different?</h4>
      <p>Soma is not just another study tool — it’s a personal learning partner built with empathy, discipline, and purpose. It embodies the balance between technology and moral values, promoting learning that uplifts minds without compromising integrity.</p>
    </div>
  </div>
);

const TermsContent: React.FC = () => (
  <div className="space-y-6">
    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Terms and Conditions</h3>
    <p className="text-xs text-slate-500 dark:text-slate-400">Effective Date: October 28, 2025</p>

    <div>
      <h4 className="font-semibold">1. Introduction</h4>
      <p>Welcome to Soma – Study Partner (“Soma”, “we”, “our”, or “us”). By using this application, you agree to these Terms and Conditions. Soma is designed for educational purposes only.</p>
      {/* <p className="mt-2 italic text-slate-500 dark:text-slate-400">“Whatever you do, work at it with all your heart, as working for the Lord…” — Colossians 3:23</p> */}
    </div>

    <div>
      <h4 className="font-semibold">2. User Responsibilities</h4>
      <p>You agree to use Soma solely for educational purposes, provide truthful information, and respect intellectual property rights. Misuse may result in suspension.</p>
    </div>

    <div>
      <h4 className="font-semibold">3. Privacy and Data Protection</h4>
      <p>Your privacy is sacred. We do not sell your data. Personal data is used only to improve your learning experience and is securely encrypted. You can request data deletion at any time.</p>
      {/* <p className="mt-2 italic text-slate-500 dark:text-slate-400">“A faithful person will be richly blessed…” — Proverbs 28:20</p> */}
    </div>

    <div>
      <h4 className="font-semibold">4. Intellectual Property Rights</h4>
      <p>All intellectual property of Soma belongs exclusively to Adeoye Opeyemi. You may not reproduce, resell, or reverse-engineer any part of it without consent.</p>
    </div>

    <div>
      <h4 className="font-semibold">5. Limitation of Liability</h4>
      <p>Soma and its developer are not liable for data loss, misuse of the application, or damages from third-party integrations. Use at your own discretion.</p>
    </div>

    <div>
      <h4 className="font-semibold">6. Acceptable Use Policy</h4>
      <p>Soma must not be used to promote violence, hate speech, spread malware, or engage in academic dishonesty. Violating accounts will be terminated.</p>
    </div>

    <div>
      <h4 className="font-semibold">7. Contact and Support</h4>
      <p>For inquiries, contact Adeoye Opeyemi at adeoyeopeyemi951@gmail.com or via WhatsApp at +234 812 406 8599.</p>
    </div>

    <div>
      <h4 className="font-semibold">8. Governing Law</h4>
      <p>These Terms are governed by the laws of the Federal Republic of Nigeria.</p>
    </div>
  </div>
);

const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'terms'>('faq');

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <div className="flex border border-slate-200 dark:border-slate-600 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${
                activeTab === 'faq'
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              FAQ
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${
                activeTab === 'terms'
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Terms & Conditions
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 md:p-8 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
          {activeTab === 'faq' ? <FAQContent /> : <TermsContent />}
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
