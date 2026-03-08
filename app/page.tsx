"use client";
import React from "react";
import Image from "next/image";
import { useState } from "react";
export default function Home() {
  
  return (
    <div className="min-h-screen bg-[#FFF8E7] font-sans flex flex-col items-center  pb-8 overflow-x-hidden">
      {/* ===== TOP SECTION / VIEWPORT 1 ===== */}
      <Section1 />
      {/* ===== MIDDLE SECTION / VIEWPORT 2 ===== */}

      <div className="w-[92%] max-w-[1200px] flex flex-row min-h-[calc(100vh-80px)]  px-8 gap-1">
        {/* Left Card: How This Site Works */}
        <div className="flex-[1.5] bg-white  rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)]  flex flex-col items-center gap-3 border border-gray-50  mt-10 p-1">
          <h2 className="text-[32px] h-25 flex items-center justify-center font-bold text-black mb-5 text-center w-full ">
            How This Site Works?
          </h2>

          {/* Video Placeholder */}
          <div className="w-full max-w-[450px] h-[240px] rounded-[16px] border-[5px] border-black flex items-center justify-center relative overflow-hidden mb-12 shrink-0">
            {/* Image */}
            <Image
              src="/section1-preview.png"
              alt="Demo preview"
              fill
              className="object-cover"
            />

            {/* Fade overlay */}
            <div className="absolute inset-0 bg-white/60"></div>

            {/* Play button */}
            <div className="w-16 h-16 bg-gray-300/90 rounded-full flex items-center justify-center z-10 cursor-pointer shadow-md hover:bg-gray-300 transition-colors border-2 border-white">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <polygon points="6,4 20,12 6,20" fill="black" />
              </svg>
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-6 w-[85%] mt-3">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex gap-6 items-center">
                <div className="w-[95px] h-[95px] rounded-full border-[2px] border-[#FDE047] flex items-center justify-center text-[22px] font-bold text-black flex-shrink-0 bg-white">
                  {num}
                </div>
                <p className="text-[16px] text-gray-600 leading-[1.6] font-medium pt-1">
                  Lorem ipsum dolor sit amet consectetur. Porttitor eu cursus
                  arcu viverra eros at a sed dignissim. Nibh amet at nibh
                  pulvinar accumsan at quisque orci.
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: FAQ */}
        <div className="flex-1 bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-10 flex flex-col border border-gray-50 ">
          <h2 className="text-[24px] font-bold text-black mb-6">
            Frequently asked questions:
          </h2>

          <div className="flex flex-col gap-5 px-2">
            {/* Expanded Item */}
            <div className="rounded-[16px] border-[1.5px] border-[#A7F3D0] p-6 flex flex-col gap-4 bg-white shadow-sm mx-2">
              <div className="flex justify-between items-center cursor-pointer">
                <span className="text-[18px] font-bold text-black">
                  Why to use this site?
                </span>

                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="black"
                  strokeWidth="2.5"
                >
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </div>

              <p className="text-[14px] text-gray-500 leading-[1.7]">
                Lorem ipsum dolor sit amet consectetur. Sed vitae proin enim
                amet consequat sit. Lorem convallis imperdiet at quis feugiat
                est dignissim in mi. A odio purus feugiat volutpat tellus felis
                amet vulputate urna.
              </p>
            </div>

            {/* Collapsed Items */}
            {[
              ["Will it help me in my", "FFCS"],
              ["Do I need to be a VIT student to use", "this site?"],
              ["Lorem ipsum dolor sit amet", "consectetur."],
            ].map((lines, i) => (
              <div
                key={i}
                className="rounded-[16px] border-[1.5px] border-[#A7F3D0] px-6 py-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
              >
                <span className="text-[15px] font-semibold text-black leading-tight">
                  {lines[0]}
                  <br />
                  {lines[1]}
                </span>

                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="black"
                  strokeWidth="2.5"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SPACER ===== */}
      <div className="h-[120px]" />

      {/* ===== FULL WIDTH FOOTER ===== */}
      <FooterSection/>
    </div>
  );
}

function TimetableIllustration() {
  const [hiddenBox, setHiddenBox] = React.useState(null);
  const colors = [
    ["#A0C4FF", "#CAFFD0", "#E9D5FF", "#CAFFD0", "#FEF08A"],
    ["#A0C4FF", "#E9D5FF", "#FEF08A", "#E9D5FF", "#A0C4FF"],
    ["#A0C4FF", "#CAFFD0", "#CAFFD0", "#A0C4FF", "#E9D5FF"],
    ["#E9D5FF", "#FEF08A", "#E9D5FF", "#CAFFD0", "#FEF08A"],
  ];

  const bindings = [
    "#E9D5FF",
    "#A0C4FF",
    "#CAFFD0",
    "#FEF08A",
    "#C4B5FD",
    "#CAFFD0",
    "#E9D5FF",
  ];

  return (
    <div className="relative w-[420px] shrink-0 transform scale-[0.95] lg:scale-100 origin-right ">
      {/* Notebook Rings */}
      <div className="absolute -top-4 left-0 w-full flex justify-around px-6 z-10 ">
        {bindings.map((color, i) => (
          <div
            key={i}
            className="w-[20px] h-[40px] rounded-full shadow-md"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Notebook Top */}
      <div className="h-[60px] bg-gradient-to-b from-[#6B6B6B] to-[#505050] rounded-t-[20px] shadow-inner" />

      {/* Notebook Body */}
      <div className="bg-white rounded-b-[20px] border border-gray-200 p-6 shadow-[0px_10px_35px_rgba(0,0,0,0.08)] mx-8">
        <div className="grid grid-cols-5 gap-3">
          {colors.flat().map((color, i) => (
            <div
              key={i}
              onClick={() => setHiddenBox(i)}
              onMouseLeave={() => setHiddenBox(null)}
              className={`h-[42px] rounded-[10px] cursor-pointer transition-all duration-200 ${
                hiddenBox === i ? "opacity-0 scale-75" : "opacity-100"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
function Section1() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="w-full min-h-screen flex justify-center items-center bg-[#FFF8E7]">
        <div className="w-[92%] max-w-[1200px] bg-white rounded-4xl shadow-[0_8px_30px_rgba(0,0,0,0.03)]  min-h-[680px]      flex flex-col relative">
          {/* NAVBAR */}
          <nav className="w-full  h-[102px]   rounded-t-[28px] shadow-[0px_6px_30.1px_rgba(186,185,185,0.25)] relative">
            <span className="left-20 top-7 text-[30px] font-bold text-black tracking-widest uppercase absolute">
              FFCS
            </span>

            <button className="right-20 top-7 absolute w-[120px] h-[45px] rounded-[8px] border-[3px] border-[#93C5FD] bg-white px-10 py-2.5 text-[14px] font-semibold text-black hover:bg-gray-50 transition-colors shadow-sm">
              Login
            </button>
          </nav>

          {/* HERO */}
          <div className="flex flex-col lg:flex-row items-center justify-around flex-1 w-full gap-8 mt-4 px-10">
            {/* Left Content */}
            <div className=" flex-1 flex flex-col h-80 justify-center items-center mt-[-40px] relative">
              <h1 className="text-[72px] xl:text-[86px]  font-black text-black leading-[0.95] tracking-tighter mb-5 top-0 absolute">
                Build Your
                <br />
                Timetable
              </h1>
              <p className="max-w-[360px] text-[15px] text-gray-800 font-medium leading-[1.6] mb-8 absolute top-43  ">
                Lorem Ipsum Dolor Sit Amet, Consectetur
                <br />
                Adipiscing Elit, Sed Do Eiusmod Tempor
              </p>
              <div className="flex gap-4 absolute top-60">
                <button
                  onClick={() => setOpen(true)}
                  className="rounded-[8px] w-[180px] h-[50px]  py-3.5 text-[14px] font-bold text-black border-[1.5px] border-[#A0C4FF] bg-[#A0C4FF] hover:bg-[#8ab2f2] transition-colors shadow-sm"
                >
                  Get Started
                </button>
                {open && (
                  <div className="fixed  inset-0 flex items-center justify-center bg-black/30 z-50">
                    {/* Modal */}
                    <div className="flex items-center justify-center w-[949px] h-[511px] bg-[#FFFCEE] rounded-[20px] shadow-xl p-8 relative">
                      {/* Close Button */}
                      <div className="relative bg-[#FAFAFA] w-[900px] h-[459px] flex flex-col items-center rounded-[20px] p-10 shadow-[4px_4px_4px_rgba(191,191,191,0.25)]">
                        {/* Close Button */}
                        <button
                          onClick={() => setOpen(false)}
                          className="absolute top-6 right-6 text-gray-500 hover:text-black text-[28px]"
                        >
                          ✕
                        </button>

                        {/* Title */}
                        <h2 className="text-[32px] font-semibold text-center mb-2 absolute top-[50px]">
                          Welcome back, Sravan Kowsik Gonuguntla!
                        </h2>

                        {/* Divider */}
                        <div className="w-[700px] h-[1px] bg-gray-300 mb-4 absolute top-[90px]"></div>

                        {/* Subtitle */}
                        <p className=" text-center text-[20px] mb-12 absolute top-[110px]">
                          Choose what you'd like to do next
                        </p>

                        {/* Options */}
                        <div className="flex gap-14 absolute top-[180px]">
                          {/* Create new */}
                          <button className="flex flex-col items-center justify-center bg-[#E9F3E8] border-[5px] border-[#D4F4E6] rounded-[16px] p-6 w-[290px] h-[200px] shadow hover:bg-green-200 transition">
                            <Image
                              src="/create_new.png"
                              alt="create"
                              width={167}
                              height={101}
                            />

                            <p className=" font-medium text-center">
                              Create a new one
                            </p>
                          </button>

                          {/* View saved */}
                          <button className="flex flex-col items-center justify-center bg-[#E9D5FF] border-[#F2D8FE] border-[5px] rounded-[16px] p-6 w-[290px] h-[200px] shadow hover:bg-purple-300 transition">
                            <Image
                              src="/savedTimeTable.png"
                              alt="saved"
                              width={167}
                              height={101}
                            />

                            <p className="mt-4 font-medium text-center">
                              View saved timetables
                            </p>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <button className="rounded-[8px] w-[180px] h-[50px]  border-[1.5px] border-[#A0C4FF] px-8 py-3.5 text-[14px] font-bold text-black bg-white hover:bg-blue-50 transition-colors shadow-sm">
                  Slot View
                </button>
              </div>
            </div>

            {/* Right Content */}
            <div className="flex-1 flex justify-center items-center shrink-0 pr-10 pl-4">
              <TimetableIllustration />
            </div>
          </div>
        </div>

        {/* ===== SPACER ===== */}
        <div className="h-[80px]" />
      </div>
    </>
  );
}

function FooterSection() {
  return (
    <div className="w-full flex flex-col relative z-0 mb-[60px]">
      {/* Dark Header */}
      <div className="w-full h-[96px] bg-[#5B5B5B] rounded-t-[28px] relative z-10 shadow-md">
        {/* Bindings */}
        <div className="absolute top-[-25px] left-0 w-full flex justify-around px-8 md:px-20 z-20">
          {[
            "#E9D5FF",
            "#A0C4FF",
            "#CAFFD0",
            "#FDFFB6",
            "#C4B5FD",
            "#CAFFD0",
            "#E9D5FF",
          ].map((c, i) => (
            <div
              key={i}
              className="w-[42px] h-[83px] rounded-[14px] shadow-sm border border-black/5"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div className="w-full h-[280px] bg-[#F3F4F6] border-x border-b border-gray-200 p-6 rounded-b-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        {/* GRID LAYOUT */}
        <div className="grid grid-cols-3 grid-rows-[1fr_auto] gap-3 h-full">
          {/* FFCS (left column full height) */}
          <div className="row-span-2 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col justify-center">
            <h3 className="text-[55px] font-black tracking-widest uppercase mb-2">
              FFCS
            </h3>

            <p className="text-[25px] leading-[1.6]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu
              turpis molestie, dictum est a, mattis tellus. Sed dignissim, metus
              nec fringilla accumsan.
            </p>
          </div>

          {/* BUTTON GRID */}
          <div className="bg-white border border-gray-100 rounded-[20px] p-4 shadow-sm grid grid-cols-2 grid-rows-2 gap-1">
            <button className="bg-[#A0C4FF] rounded-[12px] flex items-center justify-center px-4 py-2 gap-3 hover:opacity-90">
              <div className="w-20 h-20 relative rounded flex items-center justify-center ">
                <Image
                  src="/calendar_icon2.png"
                  alt="calendar"
                  fill
                  className="object-cover"
                />
              </div>

              <span className="text-[25px] font-bold leading-tight">
                Generate <br /> timetable
              </span>
            </button>
            <button className="bg-[#BFA5EE] rounded-[12px] flex items-center justify-center px-4 py-2 gap-3 hover:opacity-90">
              <div className="w-20 h-20 relative rounded flex items-center justify-center ">
                <Image
                  src="/Clock.png"
                  alt="calendar"
                  fill
                  className="object-cover"
                />
              </div>

              <span className="text-[22px] font-bold leading-tight">
                View Saved <br /> timetables
              </span>
            </button>
            <button className="bg-[#B8EDC0] rounded-[12px] flex items-center justify-center px-4 py-2 gap-3 hover:opacity-90">
              <div className="w-25 h-10 relative rounded flex items-center justify-center ">
                <Image
                  src="/slot_icon.png"
                  alt="calendar"
                  fill
                  className="object-cover"
                />
              </div>

              <span className="text-[25px] font-bold leading-tight">
                View Slots
              </span>
            </button>
            <button className="bg-[#F9EEAA] rounded-[12px] flex items-center justify-center px-4 py-2 gap-3 hover:opacity-90">
              <div className="w-10 h-10 relative rounded flex items-center justify-center ">
                <Image
                  src="/team_icon.png"
                  alt="calendar"
                  fill
                  className="object-cover"
                />
              </div>

              <span className="text-[25px] font-bold leading-tight">
                View Team
              </span>
            </button>
          </div>

          {/* LETTER BOX */}
          <div className="bg-white border border-gray-100 rounded-[20px] shadow-sm relative overflow-hidden">
            <div className="absolute top-6 left-6 bg-[#E9D5FF] w-[34px] h-[34px] flex items-center justify-center font-bold rotate-[-12deg] rounded">
              C
            </div>

            <div className="absolute top-[90px] left-[65px] bg-[#FDFFB6] w-[34px] h-[34px] flex items-center justify-center font-bold rotate-[8deg] rounded">
              D
            </div>

            <div className="absolute top-6 left-[105px] bg-[#CAFFD0] w-[34px] h-[34px] flex items-center justify-center font-bold rotate-[15deg] rounded">
              G
            </div>

            <div className="absolute top-10 right-8 bg-[#A0E8AF] w-[34px] h-[34px] flex items-center justify-center font-bold rotate-[25deg] rounded">
              E
            </div>

            <div className="absolute top-6 right-[75px] bg-[#A0C4FF] w-[34px] h-[34px] flex items-center justify-center font-bold rotate-[-18deg] rounded">
              B
            </div>

            <div className="absolute top-[85px] right-[25px] bg-[#FDFFB6] w-[34px] h-[34px] flex items-center justify-center font-bold rotate-[-6deg] rounded">
              A
            </div>

            <div className="absolute top-[95px] right-[85px] bg-[#CDB4DB] w-[34px] h-[34px] flex items-center justify-center font-bold rotate-[22deg] rounded">
              F
            </div>
          </div>

          {/* BUILT WITH */}
          <div className="h-[72px] bg-white border border-gray-100 rounded-[16px] shadow-sm flex items-center justify-center text-[13px] font-bold">
            Built with <span className="text-red-500 mx-1">❤️</span> by
            Microsoft Innovations Club
          </div>

          {/* GET UPDATES */}
          <div className="h-[72px] bg-white border border-gray-100 rounded-[16px] shadow-sm flex items-center p-1.5 gap-2">
            <input
              type="text"
              placeholder="Get updates"
              className="flex-1 px-3 text-[13px] outline-none bg-transparent"
            />

            <button className="w-[50px] bg-[#A7F3D0] rounded-[10px] h-full flex items-center justify-center hover:opacity-80">
              <Image src="/Vector.png" alt="bell icon" width={20} height={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

