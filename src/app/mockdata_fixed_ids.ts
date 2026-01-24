import { ProductWithOptionalDescription } from '@/types';

// sub categorias de bebidas: Gaseosas, jugos y aguas saborizadas, Cervezas, Aguas tónicas, Aguas saborizadas, Aguas minerales y soda

export const products: ProductWithOptionalDescription[] = [
  {
    id: 1,
    name: 'Pan Dulce Artesanal (250 gr x porc)',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1759682417/WhatsApp_Image_2025-10-04_at_15.47.40_betqqt.jpg',
    active: false,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 2,
    name: 'Pañuelitos c/dulce de leche x 1 u.',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754943587/Nuevo_Imagen_de_mapa_de_bits_2_m7pbi2.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 3,
    name: 'Bizcocho negro x 1 u.',
    price: 600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754699929/bizcocho_negro_edhnz0.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 4,
    name: 'Galleta Chip Chocolate x 100 gr',
    price: 900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754338286/galletas_chip_choco_v9gdxr.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 5,
    name: 'Galleta Chocolate x 100 gr',
    price: 900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754338286/galletas_chip_choco_v9gdxr.png',
    active: false,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 6,
    name: 'Galleta de coco x 100 gr',
    price: 900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754417022/WhatsApp_Image_2025-08-05_at_13.33.50_2_dzodjo.jpg',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 7,
    name: 'Galleta pepa x 100 gr',
    price: 900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754417022/WhatsApp_Image_2025-08-05_at_13.33.50_1_m320wt.jpg',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 8,
    name: 'Pan Hamb. Brioche c/semilla x 4 u.',
    price: 2700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754400444/Brioche_Buns_in_Natural_Light_odaipl.png',
    active: true,
    categories: 'Pan para sanguchess',
    mainCategory: 'panaderia',
  },
  {
    id: 9,
    name: 'Pan Hamb papa c/hebras queso x 4 u.',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754397736/pan_ham_papa_queso_civzel.png',
    active: false,
    categories: 'Pan para sanguchess',
    mainCategory: 'panaderia',
  },
  {
    id: 10,
    name: 'Pan lactal blanco',
    price: 3200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754398259/IMG_20250802_181555_1_dznytj.jpg',
    active: true,
    categories: 'Panes lactales',
    mainCategory: 'panaderia',
  },
  {
    id: 11,
    name: 'Pan lactal negro',
    price: 3200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754400359/ChatGPT_Image_Aug_5_2025_10_09_37_AM_nnt8e2.png',
    active: true,
    categories: 'Panes lactales',
    mainCategory: 'panaderia',
  },
  {
    id: 12,
    name: 'Pan lactal blanco con semilla',
    price: 4000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754398259/IMG_20250802_181555_1_dznytj.jpg',
    active: false,
    categories: 'Panes lactales',
    mainCategory: 'panaderia',
  },
  {
    id: 13,
    name: 'Palmeritas x 100 gr',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754338914/palmerita_c5bvfa.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 14,
    name: 'Rosquillas x 100 gr',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754339225/rosquillas_sothh7.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 15,
    name: 'Semoladas c/semillas x 100 gr',
    price: 800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754339610/semoladas_ycdhyp.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 16,
    name: 'Semoladas comun x 100 gr',
    price: 800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754339610/semoladas_ycdhyp.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 17,
    name: 'Pan chip x 12 u.',
    price: 4000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754342144/ChatGPT_Image_Aug_4_2025_06_15_29_PM_em6t2k.png',
    active: true,
    categories: 'Pan para sanguchess',
    mainCategory: 'panaderia',
  },
  {
    id: 18,
    name: 'Pan pebete x 6 u.',
    price: 2800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754348798/IMG_20250718_110828_genzx4.jpg',
    active: true,
    categories: 'Pan para sanguchess',
    mainCategory: 'panaderia',
  },
  {
    id: 19,
    name: 'Pan Brioche Viena x 6 u.',
    price: 2400,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754348950/IMG_20250721_222031_fzj982.jpg',
    active: true,
    categories: 'Pan para sanguchess',
    mainCategory: 'panaderia',
  },
  {
    id: 20,
    name: 'Mini tarta cabsha',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754340354/ChatGPT_Image_Aug_4_2025_05_45_35_PM_l1rn70.png',
    active: false,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 21,
    name: 'Alfajor maizena',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754341075/ChatGPT_Image_Aug_4_2025_05_57_37_PM_zpcivy.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 22,
    name: 'Bizcocho grasa x 100 gr',
    price: 800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754340174/IMG_20250725_135517_pqcv55.jpg',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 23,
    name: 'Hamburguesa Paladini 2x80gr (pack)',
    price: 10.99,
    image: '/images/product1.jpg',
    active: false,
    categories: 'Pan para sanguchess',
    mainCategory: 'panaderia',
  },
  {
    id: 24,
    name: 'Mostaza Danica Fiesta x 220gr',
    price: 12.99,
    image: '/images/product2.jpg',
    active: false,
    categories: '',
    mainCategory: 'otros',
  },
  {
    id: 25,
    name: 'Mayones Hellmans x 237gr',
    price: 10.99,
    image: '/images/product1.jpg',
    active: false,
    categories: '',
    mainCategory: 'otros',
  },
  {
    id: 26,
    name: 'Pan lactal artesanal',
    price: 3900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754398259/IMG_20250802_181555_1_dznytj.jpg',
    active: false,
    categories: 'Panes lactales',
    mainCategory: 'panaderia',
  },
  {
    id: 27,
    name: 'Pan lactal integral (a pedido)',
    price: 4500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754398462/IMG-20250724-WA0028_rtjcs3.jpg',
    active: true,
    categories: 'Panes lactales',
    mainCategory: 'panaderia',
  },
  {
    id: 28,
    name: 'Pan doble salvado',
    price: 2800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1759681769/WhatsApp_Image_2025-10-04_at_15.47.39_nehaxu.jpg',
    active: false,
    categories: 'Panes lactales',
    mainCategory: 'panaderia',
  },
  {
    id: 29,
    name: 'Fajitas para tacos x 12u',
    price: 2700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1762956270/Chicken-Tacos-900x570-sRGB-Photoroom_1_r2mnxa.png',
    active: true,
    categories: 'fajitas',
    mainCategory: 'panaderia',
  },
  {
    id: 30,
    name: 'Pan Hamburguesa tipo campo x 4 u.',
    price: 2300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754397482/pan_hamb_campo_ueohlv.png',
    active: false,
    categories: 'Pan para sanguchess',
    mainCategory: 'panaderia',
  },
  {
    id: 31,
    name: 'Pan hamburguesa común x 4 u.',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754397946/pan_hamb_comun_vu3ngr.png',
    active: false,
    categories: 'Pan para sanguchess',
    mainCategory: 'panaderia',
  },
  {
    id: 32,
    name: 'Milanesas de pollo GRANGYS x Kg',
    price: 9500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1757777349/milapolloGRANGYS_vr0wm9.jpg',
    active: true,
    categories: 'Congelados',
    mainCategory: 'congelados',
  },
  {
    id: 33,
    name: 'Papas noisette GRANGYS x Kg',
    price: 8900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1756669796/ChatGPT_Image_Aug_31_2025_04_49_10_PM_vyw34i.png',
    active: false,
    categories: 'Congelados',
    mainCategory: 'congelados',
  },
  {
    id: 34,
    name: 'Papas bastón BEM BRASIL x Kg',
    price: 6000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764460814/papas-baston_cppdvx.png',
    active: true,
    categories: 'Congelados',
    mainCategory: 'congelados',
  },
  {
    id: 35,
    name: 'Patitas de pollo comunes GRANGYS x kg',
    price: 7300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754341604/patitas_1_ttdx5l.png',
    active: true,
    categories: 'Congelados',
    mainCategory: 'congelados',
  },
  {
    id: 36,
    name: 'Patitas de pollo J y Q  GRANGYS x kg',
    price: 8400,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754341500/patitajyq_tl6acn.png',
    active: true,
    categories: 'Congelados',
    mainCategory: 'congelados',
  },
  {
    id: 37,
    name: 'Crocante de pollo GRANGYS x Kg',
    price: 9800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754155369/nuggets-pollo_1_1_klayjk.png',
    active: true,
    categories: 'Congelados',
    mainCategory: 'congelados',
  },
  {
    id: 38,
    name: 'Bocadito Calabaza y muzzarella GRANGYS x Kg',
    price: 7000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754341433/calabaza_ouir2b.png',
    active: true,
    categories: 'Congelados',
    mainCategory: 'congelados',
  },
  {
    id: 39,
    name: 'Pan Chip Comun x 1kg (Por encargo)',
    price: 6000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754402370/chip_comun_lemdjp.png',
    active: true,
    categories: 'Pan para sanguchess',
    mainCategory: 'panaderia',
  },
  {
    id: 40,
    name: 'Bocadito Papa y Queso GRANGYS x Kg',
    price: 7000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754341674/papaymuzza_eukr8c.png',
    active: true,
    categories: 'Congelados',
    mainCategory: 'congelados',
  },
  {
    id: 41,
    name: 'Bocadito de muzzarella GRANGYS x Kg',
    price: 10900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1756669658/bocadito-muzza_zcwdeg.jpg',
    active: false,
    categories: 'Congelados',
    mainCategory: 'congelados',
  },
  {
    id: 42,
    name: 'Mantecado',
    price: 600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754402610/mantecado_dixkls.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 43,
    name: 'Mini pastafrola',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754340851/ChatGPT_Image_Aug_4_2025_05_53_46_PM_whchf1.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 44,
    name: 'tostadas dulces x 100 gr',
    price: 750,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754402420/tostadas_scvuom.png',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 45,
    name: 'Grisines comunes x 100 gr',
    price: 900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754417023/WhatsApp_Image_2025-08-05_at_14.18.20_2_pefrvk.jpg',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 46,
    name: 'Grisines c/semillas x 100 gr',
    price: 900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754417022/WhatsApp_Image_2025-08-05_at_14.18.21_ccdyy2.jpg',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 47,
    name: 'Grisines integrales x 100 gr',
    price: 1000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754417022/WhatsApp_Image_2025-08-05_at_14.18.20_1_ximfo1.jpg',
    active: false,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 48,
    name: 'Biscuit x 100 gr',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754417024/WhatsApp_Image_2025-08-05_at_14.18.20_ab8ybs.jpg',
    active: true,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 49,
    name: 'Pan de leche x unidad',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754417022/WhatsApp_Image_2025-08-05_at_13.33.50_gvftqk.jpg',
    active: false,
    categories: 'Galletas y variedades',
    mainCategory: 'panaderia',
  },
  {
    id: 50,
    name: 'COMBO 1',
    price: 13000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754612528/WhatsApp_Image_2025-08-07_at_20.16.17_qjfhyr.jpg',
    active: true,
    categories: 'Combo Hamburguesas',
    mainCategory: 'combos',
    description: [
      { text: '4 Hamb swift CASERAS  (120 gr)' },
      {
        text: '4 Panes artesnales:',
        subItems: [
          'brioche c/semilla',
          // 'Pan de papa c/hebras de queso',
          // 'Pan tipo mostaza',
        ],
      },
    ],
  },
  {
    id: 51,
    name: 'COMBO 2',
    price: 11000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754612528/WhatsApp_Image_2025-08-07_at_20.16.17_qjfhyr.jpg',
    active: true,
    categories: 'Combo Hamburguesas',
    mainCategory: 'combos',
    description: [
      { text: '4 Hamb Swift XL (125 gr)' },
      {
        text: '4 Panes artesnales:',
        subItems: [
          'brioche c/semilla',
          // 'Pan de papa c/hebras de queso',
          // 'Pan tipo mostaza',
        ],
      },
    ],
  },
  {
    id: 52,
    name: 'COMBO 4',
    price: 8500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754612528/WhatsApp_Image_2025-08-07_at_20.16.17_qjfhyr.jpg',
    active: false,
    categories: 'Combo Hamburguesas',
    mainCategory: 'combos',
    description: [
      { text: '4 Hamb. Paladini/Swift clasica (80 gr)' },
      {
        text: '4 Panes artesnales:',
        subItems: [
          'brioche c/semilla',
          // 'Pan de papa c/hebras de queso',
          // 'Pan tipo mostaza',
        ],
      },
    ],
  },
  {
    id: 53,
    name: 'COMBO 3',
    price: 6500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1754612528/WhatsApp_Image_2025-08-07_at_20.16.17_qjfhyr.jpg',
    active: false,
    categories: 'Combo Hamburguesas',
    mainCategory: 'combos',
    description: [
      { text: '4 Hamb. Paladini/Swift clasica (80 gr)' },
      { text: '4 Panes comunes' },
    ],
  },
  {
    id: 54,
    name: 'COMBO P.1',
    price: 4000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1757777760/panchos_azftf0.avif',
    active: true,
    categories: 'Combo Pancho',
    mainCategory: 'combos',
    description: [
      { text: '6 salchichas La Blanca' },
      { text: '6 Panes Viena Brioch' },
    ],
  },
  {
    id: 55,
    name: 'COMBO P.2',
    price: 2800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1757777760/panchos_azftf0.avif',
    active: false,
    categories: 'Combo Pancho',
    mainCategory: 'combos',
    description: [
      { text: '6 salchichas La Blanca' },
      { text: '6 Panes comunes Albertus' },
      // { text: '1 Papas pay Zingara x 150 grs' },
    ],
  },
  {
    id: 56,
    name: 'Papas fritas clasicas x 140 gr',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1755638381/papas-fritas-removebg-preview_gzpwci.png',
    active: true,
    categories: 'Snaks',
    mainCategory: 'snaks',
  },
  {
    id: 57,
    name: 'Chizitos de queso x 95gr',
    price: 1300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1755700005/transparent-Photoroom__1_-removebg-preview_bz0u5u.png',
    active: false,
    categories: 'Snaks',
    mainCategory: 'snaks',
  },
  {
    id: 58,
    name: 'Papas fritas pay x 150 gr',
    price: 2300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1755638506/papas_pay__3_-removebg-preview_xw2l6y.png',
    active: true,
    categories: 'Snaks',
    mainCategory: 'snaks',
  },
  {
    id: 59,
    name: 'Mani sabor pizza x 250 gr',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1755701408/WhatsApp_Image_2025-08-19_at_15.29.57-removebg-preview_tse7hb.png',
    active: true,
    categories: 'Snaks',
    mainCategory: 'snaks',
  },
  {
    id: 60,
    name: 'Mani sabor jamon x 250 gr',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1755701408/WhatsApp_Image_2025-08-19_at_15.29.57-removebg-preview_tse7hb.png',
    active: true,
    categories: 'Snaks',
    mainCategory: 'snaks',
  },
  {
    id: 61,
    name: 'Mani frito salado s/piel x 250 gr',
    price: 2400,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1755701088/transparent-Photoroom__2_-removebg-preview_nmxjoz.png',
    active: true,
    categories: 'Snaks',
    mainCategory: 'snaks',
  },
  {
    id: 62,
    name: 'Pepsi 2 L.',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1758466924/pepsi_igudpw.jpg',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 63,
    name: 'Pepsi BLACK 2 L.',
    price: 3000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1759592118/black_utktlz.webp',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 64,
    name: 'Paso de los toros Pomelo x 1.5 lt',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763910247/paso-de-los-toros_mxgtxu.jpg',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 65,
    name: '7up 2 L.',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1758467012/7up_yqcefo.jpg',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 66,
    name: '7up FREE 2 L.',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763912849/7upzero_zn98od.png',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 67,
    name: 'Mirinda Manzana 2 L.',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1758467760/Mirinda_qacu7d.webp',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 68,
    name: 'Coca Cola Zero 2.25 L.',
    price: 4000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1758467971/cocazero_wnwiti.webp',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 69,
    name: 'Coca Cola Reg 2.25 L.',
    price: 4000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1759592177/coca-cola-coca-cola-thumbnail_j5ikdn.png',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 70,
    name: 'Coca Cola Reg 2 lt RETORNABLE',
    price: 2800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1762957012/coca-reg-ret_iomymp.jpg',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 71,
    name: 'Coca Cola Zero 2 lt RETORNABLE',
    price: 2800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1762957012/coca-zero-ret_icmdun.png',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 72,
    name: 'Coca Cola Reg 1.5 L.',
    price: 3200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1759592177/coca-cola-coca-cola-thumbnail_j5ikdn.png',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 73,
    name: 'Coca Cola Zero x 1,5 lt',
    price: 3200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763910806/coca-zero-uno-y-medio_scfior.jpg',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 74,
    name: 'Sprite 2.25 L.',
    price: 3800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1758468265/sprite_mjpppn.webp',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 75,
    name: 'Fanta Naranja 2 L.',
    price: 3800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1759681406/fanta_hotw9i.webp',
    active: true,
    categories: 'Gaseosas',
    mainCategory: 'bebidas',
  },
  {
    id: 76,
    name: 'Fernet Branca 750 ml + Coca Cola 2.25 L. (zero o regular)',
    price: 20000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1758504698/fernet-con-coca_p5xhgo.jpg',
    active: true,
    categories: 'Promos Bebidas con Alcohol',
    mainCategory: 'bebidas',
    // description: [{ text: 'Coca Zero / Coca Regular' }],
  },
  {
    id: 77,
    name: 'Fernet Branca 750 ml ',
    price: 16000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764458109/fernet_branca_veie4s.jpg',
    active: true,
    categories: 'Aperitivos con alcohol',
    mainCategory: 'bebidas',
    // description: [{ text: 'Coca Zero / Coca Regular' }],
  },
  {
    id: 78,
    name: 'Agua Mineral San Miguel x 2 lts',
    price: 1200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763907736/agua-san-miguel_1_qkzcdg.png',
    active: false,
    categories: 'Aguas minerales y soda',
    mainCategory: 'bebidas',
  },
  {
    id: 79,
    name: 'Soda Sifón BENEDICTINO x 2 lts',
    price: 2200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763909916/soda_f2sdfi.png',
    active: false,
    categories: 'Aguas minerales y soda',
    mainCategory: 'bebidas',
  },
  {
    id: 80,
    name: 'Baggio fresh Naranaja x 1.5 lts',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1758928935/Baggio-naranja-dulce-1_m7zxsg.jpg',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 81,
    name: 'Baggio fresh Manzana x 1.5 lts',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1758929091/13712666-1_qqdpxb.png',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 82,
    name: 'Baggio fresh Mix-frutal x 1.5 lts',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1758929179/005-001-009_agua-saborizadas-baggio-fresh-x-15-lts-mix-frutal1-a9cc5dc0b14d303b9715884677221826-640-0_vh0uuv.jpg',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 83,
    name: 'Baggio fresh Limonada x 1.5 lts',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767651024/bagio-fresh-limonada_thxnwv.webp',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 84,
    name: 'Té La Virginia x 25 saq',
    price: 1000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763929139/te-virginia_opm2cp.webp',
    active: true,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 85,
    name: 'Yerba verdeflor x500grs',
    price: 2200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763913759/verde-flor-yerbas-serranas_heeqdp.webp',
    active: true,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 86,
    name: 'Yerba Amanda x500grs',
    price: 2400,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763915256/yerba_amanda_odi2i5.webp',
    active: false,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 87,
    name: 'Yerba taragui x500grs',
    price: 2300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763915611/yerba-taragui_t0vszk.jpg',
    active: false,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 88,
    name: 'Harina Graciela real 000 x1kg',
    price: 1000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763916896/harina_kuxx6s.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 89,
    name: 'Puré de tomate Sabores del Valle x 520 gr',
    price: 750,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763924733/pure-tomate-sabores-del-valle_savouf.jpg',
    active: true,
    categories: 'Salsas y puré de tomate',
    mainCategory: 'almacen',
  },
  {
    id: 90,
    name: 'Pulpa de tomate Sabores del Valle x 520 gr',
    price: 750,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763930118/pulpa-tomate-sabores-del-valle_nfktnl.jpg',
    active: true,
    categories: 'Salsas y puré de tomate',
    mainCategory: 'almacen',
  },
  {
    id: 91,
    name: 'Pure de tomate Noel x530 gr',
    price: 1000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763929873/pure-tomate-noel_lhowle.jpg',
    active: true,
    categories: 'Salsas y puré de tomate',
    mainCategory: 'almacen',
  },
  {
    id: 92,
    name: 'Azucar x1kg',
    price: 900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763930215/azucar-independencia-kilo_x5dsxe.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 93,
    name: 'Leche chocolatada La Serenisima x 1 lt',
    price: 3500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764192672/chocolatada-ls_e5ttcj.webp',
    active: true,
    categories: 'Chocolatadas',
    mainCategory: 'lacteos',
  },
  {
    id: 94,
    name: 'Leche Ilolay Descremada',
    price: 1950,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763929319/leche-u-a-t--ilolay-descremada-1000-cc--_exnzoh.jpg',
    active: true,
    categories: 'Leches',
    mainCategory: 'lacteos',
  },
  {
    id: 95,
    name: 'Leche Ilolay Entera',
    price: 1900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763929436/Leche-Ilolay-Entera-Nueva-Larga-Vida-1Lt_qehpuc.png',
    active: true,
    categories: 'Leches',
    mainCategory: 'lacteos',
  },
  {
    id: 96,
    name: 'Leche tregar Descremada',
    price: 1800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763929556/leche-trgar-desc_z7m35f.jpg',
    active: true,
    categories: 'Leches',
    mainCategory: 'lacteos',
  },
  {
    id: 97,
    name: 'Leche tregar entera',
    price: 1600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763929661/leche-tregar-entera_rsfxtb.jpg',
    active: false,
    categories: 'Leches',
    mainCategory: 'lacteos',
  },
  {
    id: 98,
    name: 'Leche tregar deslactosada',
    price: 1900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763929758/leche-tregar-deslactosada_fzxil5.png',
    active: true,
    categories: 'Leches',
    mainCategory: 'lacteos',
  },
  {
    id: 99,
    name: 'Jugo ADES manzana x 1 lt',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764203109/image_1_1764202979676_cudr64.png',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 100,
    name: 'Baggio Pronto x 1 lt Multifrutal',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763913305/baggio_wj0pkw.jpg',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 101,
    name: 'Fritolim COCINERO 120gr',
    price: 4000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763905548/fritolin-cocinero_r3hvp6.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 102,
    name: 'Aceite NATURA girasol x 900 ml',
    price: 3800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925154/aceite-natura_jykows.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 103,
    name: 'Arroz Molinos Ala No se pasa x 500 gr',
    price: 1200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925255/arroz-chico_h2csc5.webp',
    active: true,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 104,
    name: 'Arroz 53 largo fino x 500 gr',
    price: 850,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764788843/arroz-53_orstst.jpg',
    active: true,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 105,
    name: 'Arroz Gallo Oro x 500 gr',
    price: 1450,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767821419/gallo-oro_lwqt68.jpg',
    active: true,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 106,
    name: 'Arveja INALPA x 300 gr',
    price: 700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925360/arveja-latajpg_gkegoi.jpg',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 107,
    name: 'Edulcorante Si Diet Stevia x 200 cc',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925460/edulcarente_gj3jm2.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 108,
    name: 'Fideo entrefino Rivoli x 500 gr',
    price: 1250,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925562/rivoli-entrefino_cyneu3.webp',
    active: true,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 109,
    name: 'Fideo Rivoli Tirabuzón x 500 gr',
    price: 1200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925697/rivoli-tirabuzon_e7ufah.webp',
    active: true,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 110,
    name: 'Giacomo Capeletini J+Q x 500 gr',
    price: 4500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925788/giacomo-j-q_cyo6d5.webp',
    active: true,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 111,
    name: 'Ketchup Hellmans x 250 gr',
    price: 2100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925885/ketchup-hellmann-s-original-250-grs-_i0shg3.jpg',
    active: true,
    categories: 'Aderezos',
    mainCategory: 'almacen',
  },
  {
    id: 112,
    name: 'Manteca La Tonadita x 200 gr',
    price: 3800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925975/manteca_aoi9uz.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 113,
    name: 'Mayonesa Hellmans x 273 gr',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763926076/Mayohellmans_vjdxmv.webp',
    active: true,
    categories: 'Aderezos',
    mainCategory: 'almacen',
  },
  {
    id: 114,
    name: 'Mermelada Dulcor CIRUELA x 500 gr',
    price: 1800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763926194/mermelada-ciruela_uowxhl.jpg',
    active: true,
    categories: 'Mermeladas y dulce de leche',
    mainCategory: 'almacen',
  },
  {
    id: 115,
    name: 'Mermelada Dulcor FRUTILLA x 500 gr',
    price: 2200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763926319/mermelada-frutilla_toa56d.jpg',
    active: true,
    categories: 'Mermeladas y dulce de leche',
    mainCategory: 'almacen',
  },
  {
    id: 116,
    name: 'Mermelada Dulcor DURAZNO LIGHT x 420 gr',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763926428/mermelada-light-durazno_prpfbz.jpg',
    active: true,
    categories: 'Mermeladas y dulce de leche',
    mainCategory: 'almacen',
  },
  {
    id: 117,
    name: 'Mostaza Savora x 250 gr',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763926514/savora-chica_xebqti.jpg',
    active: true,
    categories: 'Aderezos',
    mainCategory: 'almacen',
  },
  {
    id: 118,
    name: 'Puré papas KNORR x 125 gr',
    price: 2100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763928924/pure-knorr_xk6gzt.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 119,
    name: 'Queso Untable CREMON Light x 280 gr',
    price: 3200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763928998/cremon-light_q81gaa.jpg',
    active: true,
    categories: 'Quesos untables',
    mainCategory: 'lacteos',
  },
  {
    id: 120,
    name: 'Salsa KNOR para pizza x 200 gr',
    price: 1150,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763929076/salsa-pizza_cqoyjt.webp',
    active: true,
    categories: 'Salsas y puré de tomate',
    mainCategory: 'almacen',
  },

  {
    id: 121,
    name: 'Yerba La Tranquera x 500grs',
    price: 2300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764787932/la-tranquera-500gr_oqgwfe.webp',
    active: true,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 122,
    name: 'Mate en saquitos La Tranquera x 25 u',
    price: 1000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763929245/mate-saquitos_ocqzln.jpg',
    active: true,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 123,
    name: 'Aceitunas verdes descarozadas VANOLI x 140 gr',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764788241/aceituna-desc_ws53le.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 124,
    name: 'Aceitunas verdes descarozadas VANOLI x 80 gr',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764788371/Aceitunas-Verdes-des-80gr_hrlvr1.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 125,
    name: 'Aceitunas verdes rellenas VANOLI x 140 gr',
    price: 3000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764788577/Aceitunas-Verdes-rell_hpdobg.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 126,
    name: 'Porroncito Heineken x 330 ml',
    price: 2700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764016627/botella-heinecken_lxmsyy.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 127,
    name: 'Cerveza Imperial Gold x330 ml',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/v1767794992/nano-banana-1767794910601_wlxu4g.jpg',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 128,
    name: 'Heineken lata x 473 ml',
    price: 3200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764016577/heineken-lata_x2vlms.png',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 129,
    name: 'Imperial Golden lata x 473 ml',
    price: 1900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767794675/lata-imp-golden_owlrxp.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 130,
    name: 'Norte lata x 473 ml',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764117671/lata-norte_etzdgy.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 131,
    name: 'Schneider lata x 473 ml',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764117671/lata-schneider_s1vlkf.jpg',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 132,
    name: 'Salta Negra lata x 473 ml',
    price: 2100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764017172/salta-negrapng_gclgud.png',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 133,
    name: 'Quilmes lata x 473 ml',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764016577/quilmes-lata_k5jlp7.png',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 134,
    name: 'Grolsch lata x 473 ml',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764017762/grolsch-lata_tmqpnc.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 135,
    name: 'Queso cuartirolo La Paulina x kg',
    price: 8900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764072937/queso-cuartirolo-tremblay_hhzy44.webp',
    active: true,
    categories: 'Quesos',
    mainCategory: 'lacteos',
  },
  {
    id: 136,
    name: 'Queso Untable Port Salut Light Manfrey x 180 gr',
    price: 3000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763928739/port-salut-manfrey_jdy4ul.jpg',
    active: false,
    categories: 'Quesos untables',
    mainCategory: 'lacteos',
  },
  {
    id: 137,
    name: 'Queso AZUL untable MANFREY x 180 gr',
    price: 2400,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764073710/manfrey-untable-queso-azul_v8t0uw.png',
    active: false,
    categories: 'Quesos untables',
    mainCategory: 'lacteos',
  },
  {
    id: 138,
    name: 'Queso JAMON untable MANFREY x 180 gr ',
    price: 2400,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764073709/manfrey-untable-jamon_mwrbyz.jpg',
    active: true,
    categories: 'Quesos untables',
    mainCategory: 'lacteos',
  },
  {
    id: 139,
    name: 'Tapa empanada LA TUCUMANITA x 12 u',
    price: 1200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764075851/tapa-empanada-tucumanita_psdexs.jpg',
    active: false,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 140,
    name: 'Pascualina LA TUCUMANITA x 2 un CRIOLLA/HOJALDRADA',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764075812/Pascualina-Hojaldre-La-Tucumanita_jofodk.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 141,
    name: 'Queso DAMBO TREMBLAY X 100 gr',
    price: 1250,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764112723/queso-danbo_b0rc9v.png',
    active: false,
    categories: 'Fiambres',
    mainCategory: 'fiambres',
  },
  {
    id: 142,
    name: 'Jamón Cocido Cagnoli x 100 gr',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767725428/Los_4_hermanos_14_q18tiu.png',
    active: true,
    categories: 'Fiambres',
    mainCategory: 'fiambres',
  },
  {
    id: 293,
    name: 'Paleta Cagnoli x 100 gr',
    price: 1050,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768064513/paleta-cagnoli_tdr9zx.png',
    active: true,
    categories: 'Fiambres',
    mainCategory: 'fiambres',
  },
  {
    id: 143,
    name: 'Salame Casapueblo x 100 gr',
    price: 1800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767725724/Los_4_hermanos_7_fzgmcu.jpg',
    active: true,
    categories: 'Fiambres',
    mainCategory: 'fiambres',
  },
  {
    id: 292,
    name: 'Salame Champion x 100 gr',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768064424/salame-champion_bvgnqg.png',
    active: true,
    categories: 'Fiambres',
    mainCategory: 'fiambres',
  },
  {
    id: 144,
    name: 'Agua Tónica Secco x 2lt',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764114473/seco-toinica-2l_m0xia9.png',
    active: true,
    categories: 'Aguas tónicas',
    mainCategory: 'bebidas',
  },
  {
    id: 145,
    name: 'Agua Tónica Secco x 1,5 lt',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764114472/seco-tonica-1-y-medio_lgc0ni.webp',
    active: true,
    categories: 'Aguas tónicas',
    mainCategory: 'bebidas',
  },
  {
    id: 146,
    name: 'Agua Tónica Torasso x 1,5 lt',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764114448/image_1_1764114424637_dcnx3s.png',
    active: true,
    categories: 'Aguas tónicas',
    mainCategory: 'bebidas',
  },
  {
    id: 147,
    name: 'Agua Tónica S/A Paso de los Toros x 1,5 lt',
    price: 3500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764114473/paso-de-los-toros-s-a_zjvyjj.jpg',
    active: false,
    categories: 'Aguas tónicas',
    mainCategory: 'bebidas',
  },
  {
    id: 148,
    name: 'BAGGIO Pronto DURAZNO x 1 lt',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764202334/baggio-durazno_q8a6rm.jpg',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 149,
    name: 'Aperol 750 ml + Cepitas x 1 lt',
    price: 1,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764455956/aperol-cepita_mz61mg.png',
    active: false,
    categories: 'Promos Bebidas con Alcohol',
    mainCategory: 'bebidas',
  },
  {
    id: 150,
    name: 'Aperol 750 ml',
    price: 12000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764458109/aperol_ltaw5g.jpg',
    active: true,
    categories: 'Aperitivos con alcohol',
    mainCategory: 'bebidas',
  },
  {
    id: 151,
    name: 'Sal fina celusal x 500gr',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764787742/celusal_w1fnxh.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 152,
    name: 'Avena LA ESPAÑOLA inst. x 300 gr',
    price: 1300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764796267/Avena-Instantanea-La-Espaniola-X-400-Gr_tmimtx.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 153,
    name: 'Burgol LA ESPAÑOLA x 500 gr',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764796266/Burgol-La-Espaniola-Gourmet-500-Gr_ojtwli.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 154,
    name: 'Cacao chocolino x 180 gr',
    price: 2200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764796591/chocolino_kgu1sd.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 155,
    name: 'Cacao Nesquik x 180 gr',
    price: 2600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764799723/Nesquik_oghvrm.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 156,
    name: 'Café inst La Virginia Doy Pack Clásico x 170 gr',
    price: 7800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764799934/cafe-lv_os7drz.jpg',
    active: true,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 157,
    name: 'Caldo Knor Carne x 1 u.',
    price: 300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764800029/caldos-knor_stxklp.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 158,
    name: 'Caldo Knor Verdura x 1 u.',
    price: 300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764800029/caldos-knor_stxklp.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 159,
    name: 'Caldo Knor Gallina x 1 u.',
    price: 300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764800029/caldos-knor_stxklp.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 160,
    name: 'Choclo INALPA en grano x 300 gr',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764800138/choclo_hwhguq.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 161,
    name: 'Crema de leche doble TREGAR 350cc',
    price: 4500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/v1764800208/crema-dolecrema-350cc-Tregar_oxg8p3.webp',
    active: false,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 162,
    name: 'Dulce de leche MANFREY Clásico x 400 gr',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764800309/ddl-man_evw9io.jpg',
    active: false,
    categories: 'Mermeladas y dulce de leche',
    mainCategory: 'almacen',
  },
  {
    id: 163,
    name: 'Dulce de leche Cerros Tucumanos Clásico x 400 gr',
    price: 2300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767823000/nano-banana-1767822953359_euw7xg.jpg',
    active: true,
    categories: 'Mermeladas y dulce de leche',
    mainCategory: 'almacen',
  },
  {
    id: 164,
    name: 'Fideo RIVOLI Moñito x 500 gr',
    price: 1400,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764800544/riv-mon_czja4l.webp',
    active: false,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 165,
    name: 'Fideo Mostacholi RIVOLI x 500 gr',
    price: 1250,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764800544/fideo_rivoli_mostachol_aqckhs.png',
    active: true,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 166,
    name: 'Mermelada Ciruela ARCOR x 454 gr',
    price: 3600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764801230/mermelada-arcor-ciruela_szy2nx.jpg',
    active: true,
    categories: 'Mermeladas y dulce de leche',
    mainCategory: 'almacen',
  },
  {
    id: 167,
    name: 'Mermelada Ciruela Light ARCOR x 390 gr',
    price: 3900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764801391/mmld-arcor-ciruela-light_wrizjw.webp',
    active: true,
    categories: 'Mermeladas y dulce de leche',
    mainCategory: 'almacen',
  },
  {
    id: 168,
    name: 'Fideo RIVOLI Tallarines Verdura x 500 gr',
    price: 1600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764800543/CINTA_VERDE_RIVOLI_ldkwyr.png',
    active: true,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 169,
    name: 'Mermelada Durazno Light ARCOR x 390 gr',
    price: 3900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/v1764801476/mermelada-arcor-durazno-light_fjkqt5.webp',
    active: false,
    categories: 'Mermeladas y dulce de leche',
    mainCategory: 'almacen',
  },
  {
    id: 170,
    name: 'Queso rallado MANFREY x 40 gr',
    price: 1,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: false,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 171,
    name: 'Repelente VAIS Kids spray x 200 ml',
    price: 5500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764801764/rep-vais-kid_rrw3xp.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 172,
    name: 'Repelente VAIS spray x 200 ml',
    price: 5000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764801590/rep-vais_fj9qkc.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 173,
    name: 'Rollo de cocina FELPITA Bco 3 x 40u',
    price: 2100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764801874/rollo-cocina-felpita_v9rn0b.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 174,
    name: 'Sal Parrillera CELUSAL x 1 kg',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764801952/celusal-parr_xzm3ey.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 175,
    name: 'Soda TORASSO sifón x 2 lt',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Aguas minerales y soda',
    mainCategory: 'bebidas',
  },
  {
    id: 176,
    name: 'Vitina clásica x 250 gr',
    price: 1900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764802048/vitina_ruypi4.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 177,
    name: 'Gancia sin  alcohol lata x 473 ml',
    price: 2700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764802163/gancia-s-a_x6u8d3.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 178,
    name: 'Queso en fetas La Verona x 100 gr',
    price: 1200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767725536/Los_4_hermanos_6_wdvaiy.jpg',
    active: true,
    categories: 'Fiambres',
    mainCategory: 'fiambres',
  },
  {
    id: 179,
    name: 'Jamon cocido Recreo',
    price: 1,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: false,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 180,
    name: 'Salchichas carcaraña',
    price: 1,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: false,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 181,
    name: 'Mani tostado salado c/piel x 250gr',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Snaks',
    mainCategory: 'snaks',
  },
  {
    id: 182,
    name: 'Boldo la virginia x 25saq',
    price: 2100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793982/te-boldo_zp7i6w.jpg',
    active: true,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 183,
    name: 'CIF Desinfectante Bioact dp x380 ml',
    price: 2300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 184,
    name: 'Coctel de fruta Alco (lata) x820g',
    price: 3200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 185,
    name: 'Desodorante de piso Aroma Jardin x900 cc',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 186,
    name: 'Espiral Raid x 12u',
    price: 3500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 187,
    name: 'Franela la ponderosa x1u',
    price: 1950,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 188,
    name: 'Lana Acero Ok 40 g (virulana)',
    price: 850,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 189,
    name: 'Lenteja la española x 400gr',
    price: 1900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764796267/Lentejas-La-Espa-ola-400-Gr-1-23741_itbjh9.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 190,
    name: 'Limpiador Antigrasa Bora',
    price: 1800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764796000/Limpiador-Liquido-Antigrasa-Bora-500-Cc_c2ce1e.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 191,
    name: 'Cajita de tè de manzanilla La virginia 25 sq',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793982/Te-La-Virginia-Manzamilla-25saq_q8hfwf.webp',
    active: true,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 192,
    name: 'Pan rallado Preferido 500 gr',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/v1764795207/Pan-Rallado-Preferido-X-500-Gr_chb7vs.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 193,
    name: 'Paño Media naranja Multiuso',
    price: 1000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764795769/PANIO-ABSORBENTE-MEDIA-NARANJA_ceab0w.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 194,
    name: 'Pate Swift x 90g',
    price: 1200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764795632/Pate-de-Foie-Swift-90-Gr-_1_vgi4wg.webp',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 195,
    name: 'Picadillo Swift x9 g',
    price: 1200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764795633/Picadillo-De-Carne-Swift_eqmr0b.webp',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 196,
    name: 'Polvo para hornear royal',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764795465/polvo-de-hornear-royal-x-50-gr_roz0d5.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 197,
    name: 'Ravioles Madoni 4 quesos x 500g',
    price: 2800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 198,
    name: 'Rebozador preferido x500gr',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764795208/REBOZADOR-PREFERIDO-X-500-GR_lozekv.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 199,
    name: 'Rejilla Media naranja',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764795061/rejilla_m6ekxp.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 200,
    name: 'repelente Vais bebes crema 100 ml',
    price: 8600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764794868/vais-baby_goh4ho.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 201,
    name: 'Tabletas raid x24u',
    price: 7300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/v1764794406/insecticida-raid-tabletas-24un_up1heu.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 202,
    name: 'Te de tilo LV x 25saq',
    price: 3300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793983/te-tilo_ncymf6.jpg',
    active: true,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 203,
    name: 'Trapo de piso Sacchi gris 47x57',
    price: 2200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793799/trapo-piso_ajlx2h.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 204,
    name: 'Alcohol Frau x 250cc',
    price: 1200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/v1764793654/frau-alcohol-etilico-250cc-_avsctj.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 205,
    name: 'Atùn CUMANA desmenuzado 170g aceite',
    price: 1800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793350/atun-desmenuzado-aceite_d3ojvl.webp',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 206,
    name: 'Atùn CUMANA desmenuzado 170g natural',
    price: 1800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793349/atun-desmenuzado-agua_pvp1xj.webp',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 207,
    name: 'Atùn CUMANA lomito 170g Aceite',
    price: 3700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793350/atun-lomito-aceite_owbiul.jpg',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 208,
    name: 'Atùn CUMANA lomito 170g natural',
    price: 3700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793350/atun_f6x8ij.webp',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 209,
    name: 'Champiniones Bahia enteros 400 g',
    price: 4000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793049/champignon-bahi_rx69ka.webp',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 210,
    name: 'Jugo para preparar Clight 20 sobre LIMONADA',
    price: 500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764792881/clight-lim_ewefhg.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 211,
    name: 'Jugo para preparar Clight 20 sobre MANDARINA',
    price: 500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764792882/clight-mand_nujxs8.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 212,
    name: 'Jugo para preparar Clight 20 sobre NARANJA',
    price: 500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764792882/clight-nar_wyevsm.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 213,
    name: 'Detergente Ala concentrado repuesto 450 ml',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/v1764792672/Detergente-Liquido-Ala-Limon-450_zquird.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 214,
    name: 'Lata de Durazno ALCO mitad x 820 g',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764792552/alco-durazno_qn7b7q.jpg',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 215,
    name: 'Papel hig Higienol max 4 x 80m',
    price: 4600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764792106/higienol-80_x2pqsd.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 216,
    name: 'Leche Condensada descremada Nestle 395gr',
    price: 4800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764792022/condensada-desc_aizz73.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 217,
    name: 'Leche Condensada entera Nestle 395gr',
    price: 4800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764791799/condensada-entera_wziye1.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 218,
    name: 'Palmitos en trozos CUMANA 400gr',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764791705/palmito_wj6uis.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 219,
    name: 'Queso rallado LA SERENISIMA 35gr',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764791535/quesso-ray-ls_kptikx.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 220,
    name: 'Soda Iberá sifón x 2lt',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764791365/SODA-IBERA-SIFON-DESCARTABLE-2-L_ppmxau.png',
    active: false,
    categories: 'Aguas minerales y soda',
    mainCategory: 'bebidas',
  },
  {
    id: 221,
    name: 'Pimenton Extra dulce x 50gr',
    price: 550,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 222,
    name: 'Curcuma x 50 gr',
    price: 500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 223,
    name: 'Adobo para pizza x 50 gr',
    price: 600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 224,
    name: 'Pimienta blanca  Molida x 50 gr',
    price: 550,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 225,
    name: 'Provenzal x 50 gr',
    price: 700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 226,
    name: 'oregano en hojas x 50 gr',
    price: 550,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 227,
    name: 'jardinera Inalpa x 300grs',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764790976/jardinera_gle1bl.webp',
    active: true,
    categories: 'Enlatados',
    mainCategory: 'almacen',
  },
  {
    id: 228,
    name: 'Filete de anchoas Marvellas',
    price: 7100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764790835/anchoa_vynwxh.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 229,
    name: 'Vainillin alicante x 100cc',
    price: 2100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764790718/vainillin_rhh3en.jpg',
    active: false,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 230,
    name: 'Yogur cerro tucumano sachet x 1lt Frutilla',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764790598/yogurt-frutilla_k9nuv0.jpg',
    active: true,
    categories: 'lacteos',
    mainCategory: 'lacteos',
  },
  {
    id: 231,
    name: 'Yogur cerro tucumano sachet x 1lt Vainilla',
    price: 1700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764790356/yogurt-vainilla_xcxryd.webp',
    active: true,
    categories: 'lacteos',
    mainCategory: 'lacteos',
  },
  {
    id: 232,
    name: 'Gancia sin  alcohol lata x 473 ml',
    price: 2700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764802163/gancia-s-a_x6u8d3.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 233,
    name: 'Corona lata x 473 ml',
    price: 2200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792662/lata-corona_mo6spk.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 234,
    name: 'Imperial Roja lata x 473 ml',
    price: 2200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792662/lata-imp-roja_kniteg.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 235,
    name: 'Imperial APA lata x 473 ml',
    price: 2200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792662/lata-imp-APA_tzhztu.jpg',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 236,
    name: 'Imperial IPA lata x 473 ml',
    price: 2200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792662/lata-imp-IPA_ovfuv4.jpg',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 237,
    name: 'Stella Artois lata x 473 ml',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792662/lata-stella_tlmx85.jpg',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 238,
    name: 'SIX PACK Corona lata x 473 ml',
    price: 13000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792663/sixpack-corona_d45ih2.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 239,
    name: 'SIX PACK Imperial Golden lata x 473 ml',
    price: 10500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767794995/sixpack-imp-golden_vzxkeo.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 240,
    name: 'SIX PACK Roja Imperial lata x 473 ml',
    price: 13000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792662/sixpack-imp-roja_t1qb2z.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 241,
    name: 'SIX PACK APA Imperial lata x 473 ml',
    price: 13000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792662/six-pack-imp-APA_fjx3wz.jpg',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 242,
    name: 'SIX PACK IPA Imperial lata x 473 ml',
    price: 13000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792662/sixpack-imp-IPA_n0xuy8.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 243,
    name: 'SIX PACK - Stella Artois lata x 473 ml',
    price: 14000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792662/sixpack-stella_mdsnvn.jpg',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 244,
    name: 'SIX PACK Heineken lata x 473 ml',
    price: 18000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767792781/heineken-473-ml-six-pack_pk8cmw.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 245,
    name: 'SIX PACK Grolsch lata x 473 ml',
    price: 14000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767796086/six-pack-grolsh_wy6dgy.png',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 246,
    name: 'SIX PACK Quilmes lata x 473 ml',
    price: 11000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767796369/six-pack-quilmes_e9ntn1.webp',
    active: true,
    categories: 'Cervezas',
    mainCategory: 'bebidas',
  },
  {
    id: 247,
    name: 'BAGGIO Pronto MANZANA x 1 lt',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764202334/baggio-durazno_q8a6rm.jpg',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 248,
    name: 'BAGGIO Pronto NARANJA x 1 lt',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764202334/baggio-durazno_q8a6rm.jpg',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 249,
    name: 'BAGGIO Pronto MIX FRUTAL x 1 lt',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764202334/baggio-durazno_q8a6rm.jpg',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 250,
    name: 'Jugo Cepita del valle Naranja 1,5l',
    price: 3500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793225/Jugo-Cepita-Del-Valle-Durazno-Delicioso_cee9f5.webp',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 251,
    name: 'Jugo cepita del valle durazno 1,5l',
    price: 3500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1764793225/Jugo-Cepita-Del-Valle-Durazno-Delicioso_cee9f5.webp',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 252,
    name: 'Soda BIO SPORT sifón x 2 lt',
    price: 1300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Aguas minerales y soda',
    mainCategory: 'bebidas',
  },
  {
    id: 253,
    name: 'Agua Mineral Nestlé x 2 lts',
    price: 1200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: false,
    categories: 'Aguas minerales y soda',
    mainCategory: 'bebidas',
  },
  {
    id: 254,
    name: 'Agua Mineral Palau x 2 lts',
    price: 1000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'Aguas minerales y soda',
    mainCategory: 'bebidas',
  },
  {
    id: 255,
    name: 'Monster Mango x 473 ml',
    price: 3200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767646270/monster-mango_yxvtqx.webp',
    active: true,
    categories: 'energizantes y más',
    mainCategory: 'bebidas',
  },
  {
    id: 256,
    name: 'Monster original x 473 ml',
    price: 3200,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767646117/monster-original_pzheui.webp',
    active: true,
    categories: 'energizantes y más',
    mainCategory: 'bebidas',
  },
  {
    id: 257,
    name: 'Powerade frutas tropicales x 500cc',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767646855/powerade_frutas_a10ty6.webp',
    active: true,
    categories: 'energizantes y más',
    mainCategory: 'bebidas',
  },
  {
    id: 258,
    name: 'Powerade uva x 500cc',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767646779/uva_q9e3hn.jpg',
    active: true,
    categories: 'energizantes y más',
    mainCategory: 'bebidas',
  },
  {
    id: 259,
    name: 'Powerade Sour green x 500cc',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767646708/sour_green_z2licv.webp',
    active: true,
    categories: 'energizantes y más',
    mainCategory: 'bebidas',
  },
  {
    id: 260,
    name: 'Galletas Granix Sin Sal 3 x 200 grs',
    price: 4600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767648224/granix-ssal-fliar_xeeksa.jpg',
    active: true,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 261,
    name: 'Galletas Granix Salvado 720 grs',
    price: 5400,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767648757/granix-salvado_jx0vo7.webp',
    active: true,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 262,
    name: 'Galletas Granix Salvado sin sal 690 grs',
    price: 5000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767648757/salvado-ssal_mutjq1.webp',
    active: true,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 263,
    name: 'Galletas Sandwiches Granix x 600 grs',
    price: 4500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767648757/granix-sandwich_vybtqx.webp',
    active: true,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 264,
    name: 'Galletas media tarde',
    price: 1800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767649792/media-tarde-x-3_pvmflg.jpg',
    active: false,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 265,
    name: 'Galletas la providencia x3u',
    price: 1400,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767650039/galleta-providencia-x-3_umptpw.webp',
    active: true,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 266,
    name: 'Galletas Traviata x3u',
    price: 2500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767649792/traviata-x-3_qydsq9.jpg',
    active: true,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 267,
    name: 'Pizza muzzarella',
    price: 6500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767724248/pizza-muzza_wg5h5k.jpg',
    active: false,
    categories: 'pizzas',
    mainCategory: 'pizzas',
  },
  {
    id: 268,
    name: 'Pizza especial',
    price: 7500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767724247/pizza-especial_sjuehf.jpg',
    active: true,
    categories: 'pizzas',
    mainCategory: 'pizzas',
  },
  {
    id: 269,
    name: 'Pizza ternera',
    price: 8000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767724247/pizza-ternera_cckk6h.jpg',
    active: true,
    categories: 'pizzas',
    mainCategory: 'pizzas',
  },
  {
    id: 270,
    name: 'Pizza roquefort',
    price: 8000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767724247/Pizza-Roquefort_li8awg.png',
    active: true,
    categories: 'pizzas',
    mainCategory: 'pizzas',
  },
  {
    id: 271,
    name: 'Pizza cantimpalo',
    price: 8000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/v1767724247/pizza-cantimpalo_avwba9.jpg',
    active: true,
    categories: 'pizzas',
    mainCategory: 'pizzas',
  },
  {
    id: 272,
    name: 'Lomo ahumado suizo luvianca SIN GLUTEN x 100 gr',
    price: 1800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/v1767725245/Los_4_hermanos_4_oar4vt.jpg',
    active: true,
    categories: 'Fiambres',
    mainCategory: 'fiambres',
  },
  {
    id: 273,
    name: 'Bondiola 214 SIN GLUTEN',
    price: 2600,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767725845/bondiola_hsj9sv.png',
    active: true,
    categories: 'Fiambres',
    mainCategory: 'fiambres',
  },
  {
    id: 274,
    name: 'Mortadela Champion SIN GLUTEN x 100 gr',
    price: 900,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767725428/mortadela-champion_innfkn.jpg',
    active: true,
    categories: 'Fiambres',
    mainCategory: 'fiambres',
  },
  {
    id: 275,
    name: 'Yogur gran compra sachet x 1lt Frutilla',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767726534/gran-compra-frutilla_bltavf.webp',
    active: false,
    categories: 'lacteos',
    mainCategory: 'lacteos',
  },
  {
    id: 276,
    name: 'Yogur gran compra sachet x 1lt Vainilla',
    price: 2000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767726534/gran-compra-vainilla_soe0gh.webp',
    active: false,
    categories: 'lacteos',
    mainCategory: 'lacteos',
  },
  {
    id: 277,
    name: 'Crema de leche tonadita x350cc',
    price: 4000,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767727234/crema-de-leche-tonadita-400_epdss5.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 278,
    name: 'Crema de leche tonadita x200cc',
    price: 2100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767727235/crema-de-leche_mjtnt9.webp',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 279,
    name: 'Queso rallado La Paulina x 40 gr',
    price: 1500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767790750/rallado-la-paulina_az2u3m.jpg',
    active: true,
    categories: 'Almacén',
    mainCategory: 'almacen',
  },
  {
    id: 280,
    name: 'Yerba Nobleza Gaucha x 500 grs',
    price: 2400,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767790633/nobleza-gaucha_q77b2w.webp',
    active: true,
    categories: 'Yerbas, tés y cafés',
    mainCategory: 'almacen',
  },
  {
    id: 281,
    name: 'Fideo codito Rivoli x 500 gr',
    price: 1250,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925562/rivoli-entrefino_cyneu3.webp',
    active: true,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 282,
    name: 'Fideo dedalito Rivoli x 500 gr',
    price: 1250,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763925562/rivoli-entrefino_cyneu3.webp',
    active: true,
    categories: 'Fideos y arroz',
    mainCategory: 'almacen',
  },
  {
    id: 283,
    name: 'Jugo Pera Big C x 200 ml',
    price: 500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 284,
    name: 'Jugo durazno Big C x 200 ml',
    price: 500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 285,
    name: 'Jugo manzana Big C x 200 ml',
    price: 500,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
    active: true,
    categories: 'jugos y aguas saborizadas',
    mainCategory: 'bebidas',
  },
  {
    id: 286,
    name: 'Galletas Vocacion x 141 gr',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768056201/Vovacion-x-1_ekephj.webp',
    active: true,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 287,
    name: 'Galletas Pack Vocacion vainilla 3 x 141 gr',
    price: 2700,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768056201/Vovacion-x-3_hfuodz.webp',
    active: true,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 288,
    name: 'Caritas negras Don Satur x 200 gr',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768056202/don-satur-negras_fmyzsi.webp',
    active: true,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 289,
    name: 'Bizcochos dulces Don Satur x 200 gr',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768056201/don-satur-dulces_oocsks.webp',
    active: false,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 290,
    name: 'Bizcochitos de grasa Don Satur x 200 gr',
    price: 1100,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768056201/don-satur-bizcocho-grasa_mzjcd6.jpg',
    active: true,
    categories: 'galletas',
    mainCategory: 'almacen',
  },
  {
    id: 291,
    name: 'Paleta Cagnoli x 100 gr',
    price: 1050,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1767725428/Los_4_hermanos_14_q18tiu.png',
    active: true,
    categories: 'Fiambres',
    mainCategory: 'fiambres',
  },
  {
    id: 294,
    name: 'Yogur firme frutilla Gran Compra x 120 g',
    price: 800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768065194/gra-compra-firme_zwp8fs.jpg',
    active: true,
    categories: 'lacteos',
    mainCategory: 'lacteos',
  },
  {
    id: 295,
    name: 'Yogur firme vainilla Gran Compra x 120 g',
    price: 800,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768065194/Yogur-Entero-Firme-Vainilla-Gran-Compra-120-gr-1-14381_lnyo3y.webp',
    active: true,
    categories: 'lacteos',
    mainCategory: 'lacteos',
  },
  {
    id: 296,
    name: 'Yogur frutilla LS Clasico Bat descremado x 120 gr',
    price: 1300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768065193/LS-firme-desc-frut_bdrvdf.jpg',
    active: true,
    categories: 'lacteos',
    mainCategory: 'lacteos',
  },
  {
    id: 296,
    name: 'Yogur vainilla LS Clasico Bat descremado x 120 gr',
    price: 1300,
    image:
      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1768065193/LS-firme-desc-vainilla_t9htku.jpg',
    active: true,
    categories: 'lacteos',
    mainCategory: 'lacteos',
  },
];

//      'https://res.cloudinary.com/dfwo3qi5q/image/upload/f_auto,q_auto/v1763609292/SIN_IMAGEN_qrdys8.png',
