const handleCheckIn = async ({user , currentLocation , employeeId , onMarkSuccess}) => {
    setIsLoading(true);

    const phoneNumber = user.phoneNumber.slice(3);
    const dateToday = format(new Date(), "yyyy-MM-dd");
    const nowTime = format(new Date(), "hh:mm a");

    const docRef = doc(db, "users", phoneNumber);
    const userSnap = await getDoc(docRef);

    const late = isLateCheckIn(nowTime); 
    const newEntry = {
      date: dateToday,
      checkInTime: nowTime,
      checkOutTime: null,
      status: "Present",
      location: "Office Geo",
      forget: late ? "check-in" : "",
    };

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const updatedAttendance = userData.attendance || [];

      const alreadyExists = updatedAttendance.find(
        (entry) => entry.date === dateToday
      );
      if (!alreadyExists) {
        updatedAttendance.push(newEntry);
        await setDoc(
          docRef,
          { attendance: updatedAttendance },
          { merge: true }
        );
      }
    } else {
      await setDoc(docRef, { attendance: [newEntry] });
    }

    setTimeout(() => {
      sonnerToast.success("Checked In Successfully!", {
        description: `Time: ${new Date().toLocaleTimeString()}, Location: ${currentLocation}`,
      });
      setIsCheckedIn(true);
      // localStorage.setItem(`dailyAttendance_${employeeId}_${format(new Date(), "yyyy-MM-dd")}`, "checkedIn");
      onMarkSuccess("Checked In");
      setIsLoading(false);
      setIsDialogOpen(false);
    }, 1000);
  };






  export default handleCheckIn;