import React from "react";

export default function MobilePage() {
    return (
        <div className="flex flex-col min-h-[100dvh] bg-white font-sans text-black overflow-hidden items-center justify-between">
            {/* Top Section */}
            <h1 className="text-[54px] font-[800] tracking-[-0.02em] mt-24 leading-none">
                FFCS
            </h1>

            {/* Middle icon */}
            <div className="flex-1 flex items-center justify-center -mt-16 w-full">
                <div className="w-[115px] h-[230px] border-[3px] border-black rounded-[8px] flex flex-col items-center pt-3 relative">
                    <div className="w-[7px] h-[7px] bg-black rounded-full"></div>
                    <div className="flex-1 flex items-center justify-center pb-4 text-[17px] font-bold tracking-tight">
                        FFCS
                    </div>
                </div>
            </div>

            {/* Bottom Text Area */}
            <div className="flex flex-col items-center px-6 text-center w-full pb-12">
                <h2 className="text-[42px] font-[800] leading-[1.05] tracking-tight mb-[18px] text-[#000000]">
                    Looks like you are on<br />mobile
                </h2>
                <p className="text-[21px] leading-[1.3] text-[#000000] font-[400]">
                    For the best experience, please use a<br />computer to access this website.
                </p>
            </div>

            {/* Footer Area */}
            <div className="w-full bg-[#FAFAFA] pt-5 pb-5 flex flex-col items-center justify-center text-[16px] border-t border-gray-100 shadow-[0_-20px_40px_rgba(0,0,0,0.015)]">
                <p className="mb-0 text-black font-[400]">
                    Built with <span className="text-[#FF3B30]">❤️</span> by
                </p>
                <p className="mb-0 text-black font-[400]">Microsoft Innovations Club</p>
            </div>
        </div>
    );
}
