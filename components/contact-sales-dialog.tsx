"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Phone, Building2 } from "lucide-react";

interface ContactSalesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ContactSalesDialog({ open, onOpenChange }: ContactSalesDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-zinc-200">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-zinc-900 tracking-tight">Contact Us</DialogTitle>
                    <DialogDescription className="text-zinc-500 font-medium">
                        For media inquiries, interviews, or partnership opportunities, please contact:
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#FF7A40]/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-[#FF7A40]" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-1">Office</p>
                            <p className="text-zinc-600 font-medium">Petrosphere Public Relations Office</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-1">Email</p>
                            <div className="space-y-1">
                                <a href="mailto:sales@petrosphere.com.ph" className="block text-zinc-600 font-medium hover:text-[#FF7A40] transition-colors">sales@petrosphere.com.ph</a>
                                <a href="mailto:training@petrosphere.com.ph" className="block text-zinc-600 font-medium hover:text-[#FF7A40] transition-colors">training@petrosphere.com.ph</a>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                            <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-1">Phone</p>
                            <p className="text-zinc-600 font-medium">0917-708-7994 - GLOBE</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
