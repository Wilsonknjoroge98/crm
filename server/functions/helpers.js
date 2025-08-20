// const standardizeAddress = (address) => {
//   return address
//     .toLowerCase()
//     .split(/\s+/)
//     .map((part) => {
//       const idx = part.search(/[a-z]/i);
//       if (idx === -1) return part;
//       return part.slice(0, idx) + part[idx].toUpperCase() + part.slice(idx + 1);
//     })
//     .join(' ');
// };

// const toTitleCase = (str) =>
//   str
//     .toLowerCase()
//     .split(' ')
//     .filter(Boolean)
//     .map((word) => word[0].toUpperCase() + word.slice(1))
//     .join(' ');

// const updateAddresses = () => {
//   const firestore = new Firestore();

//   const policiesRef = firestore.collection('policies');
//   policiesRef.get().then((snapshot) => {
//     snapshot.forEach((doc) => {
//       console.log(`Updating address for policy ${doc.id}`);
//       const data = doc.data();

//       if (data?.contingentBeneficiaries?.length > 0) {
//         const standardizedBeneficiaries = data.contingentBeneficiaries.map(
//           (b) => ({
//             ...b,
//             firstName: toTitleCase(b.firstName),
//             lastName: toTitleCase(b.lastName),
//           }),
//         );
//         policiesRef
//           .doc(doc.id)
//           .update({ contingentBeneficiaries: standardizedBeneficiaries });
//       }
//     });
//   });
// };

// updateAddresses();
